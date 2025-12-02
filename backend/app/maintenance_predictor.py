"""
Simple ML model for predicting next maintenance dates
Uses linear regression based on historical maintenance intervals
"""
import os
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import re


class MaintenancePredictor:
    """
    Simple predictive maintenance model that learns from historical data
    Uses average interval between maintenance events to predict next date
    """
    
    def __init__(self, data_dir: Optional[str] = None):
        """
        Initialize the predictor
        
        Args:
            data_dir: Directory containing maintenance history files
        """
        if data_dir is None:
            # Default to data/maintenance_history relative to this file
            base_dir = Path(__file__).parent.parent
            self.data_dir = base_dir / "data" / "maintenance_history"
        else:
            self.data_dir = Path(data_dir)
        
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.history_cache: Dict[str, List[Dict]] = {}
    
    def load_maintenance_history(self, property_id: str) -> List[Dict]:
        """
        Load maintenance history for a property from txt file
        
        Args:
            property_id: Property identifier (e.g., "prop-1")
            
        Returns:
            List of maintenance records with keys: asset_id, asset_name, asset_type, date, type
        """
        if property_id in self.history_cache:
            return self.history_cache[property_id]
        
        history_file = self.data_dir / f"{property_id}_maintenance_history.txt"
        
        if not history_file.exists():
            print(f"⚠ Maintenance history file not found: {history_file}")
            return []
        
        print(f"✓ Loading maintenance history from: {history_file}")
        
        records = []
        with open(history_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                # Skip comments and empty lines
                if not line or line.startswith('#'):
                    continue
                
                # Parse format: asset_id|asset_name|asset_type|maintenance_date|maintenance_type
                parts = line.split('|')
                if len(parts) >= 5:
                    try:
                        records.append({
                            'asset_id': parts[0],
                            'asset_name': parts[1],
                            'asset_type': parts[2],
                            'date': datetime.strptime(parts[3], '%Y-%m-%d'),
                            'maintenance_type': parts[4]
                        })
                    except ValueError:
                        continue
        
        # Sort by date
        records.sort(key=lambda x: x['date'])
        self.history_cache[property_id] = records
        return records
    
    def calculate_average_interval(self, dates: List[datetime]) -> float:
        """
        Calculate average interval between maintenance dates in days
        
        Args:
            dates: List of maintenance dates (sorted)
            
        Returns:
            Average interval in days
        """
        if len(dates) < 2:
            return 180.0  # Default 6 months if not enough data
        
        intervals = []
        for i in range(1, len(dates)):
            delta = (dates[i] - dates[i-1]).days
            if delta > 0:  # Only positive intervals
                intervals.append(delta)
        
        if not intervals:
            return 180.0
        
        return sum(intervals) / len(intervals)
    
    def predict_next_maintenance(
        self, 
        property_id: str, 
        asset_id: str,
        asset_type: Optional[str] = None
    ) -> Dict[str, any]:
        """
        Predict next maintenance date for an asset
        
        Args:
            property_id: Property identifier
            asset_id: Asset identifier
            asset_type: Optional asset type for fallback logic
            
        Returns:
            Dict with predicted_date, confidence, days_until, and reasoning
        """
        history = self.load_maintenance_history(property_id)
        
        # Filter history for this asset
        asset_history = [r for r in history if r['asset_id'] == asset_id]
        
        if not asset_history:
            # No history - use default intervals based on asset type
            default_intervals = {
                'AC': 180,  # 6 months
                'HEATER': 365,  # 1 year
                'LIGHTS': 365,  # 1 year
                'PLUMBING': 180,  # 6 months
                'APPLIANCES': 365,  # 1 year
                'ROUTER': 180,  # 6 months
            }
            default_days = default_intervals.get(asset_type or 'APPLIANCES', 180)
            predicted_date = datetime.now() + timedelta(days=default_days)
            
            return {
                'predicted_date': predicted_date.isoformat(),
                'confidence': 0.3,
                'days_until': default_days,
                'reasoning': f'No maintenance history found. Using default interval of {default_days} days for {asset_type or "asset"}.',
                'last_maintenance': None,
                'average_interval_days': default_days
            }
        
        # Get all maintenance dates (including repairs)
        all_dates = [r['date'] for r in asset_history]
        last_date = max(all_dates)
        
        # Calculate average interval from maintenance events only (exclude installation)
        maintenance_dates = [
            r['date'] for r in asset_history 
            if r['maintenance_type'] in ['maintenance', 'repair']
        ]
        
        if len(maintenance_dates) < 2:
            # Not enough maintenance history - use installation date
            installation_dates = [
                r['date'] for r in asset_history 
                if r['maintenance_type'] == 'installation'
            ]
            if installation_dates:
                days_since_install = (datetime.now() - installation_dates[0]).days
                # Estimate based on time since installation
                if asset_type == 'AC':
                    estimated_interval = max(180, days_since_install / 2)
                elif asset_type == 'HEATER':
                    estimated_interval = max(365, days_since_install / 2)
                else:
                    estimated_interval = 180
            else:
                estimated_interval = 180
        else:
            estimated_interval = self.calculate_average_interval(maintenance_dates)
        
        # Predict next maintenance date
        predicted_date = last_date + timedelta(days=estimated_interval)
        days_until = (predicted_date - datetime.now()).days
        
        # Calculate confidence based on amount of data
        num_records = len(maintenance_dates)
        if num_records >= 4:
            confidence = 0.85
        elif num_records >= 2:
            confidence = 0.65
        else:
            confidence = 0.45
        
        # Adjust confidence if prediction is in the past
        if days_until < 0:
            confidence *= 0.7
            reasoning = f'Predicted date has passed. Based on {num_records} maintenance records, average interval is {estimated_interval:.0f} days. Last maintenance: {last_date.strftime("%Y-%m-%d")}.'
        else:
            reasoning = f'Based on {num_records} maintenance records, average interval is {estimated_interval:.0f} days. Last maintenance: {last_date.strftime("%Y-%m-%d")}.'
        
        return {
            'predicted_date': predicted_date.isoformat(),
            'confidence': round(confidence, 2),
            'days_until': days_until,
            'reasoning': reasoning,
            'last_maintenance': last_date.isoformat(),
            'average_interval_days': round(estimated_interval, 1),
            'maintenance_count': num_records
        }
    
    def predict_all_assets(self, property_id: str) -> List[Dict]:
        """
        Predict next maintenance for all assets in a property
        
        Args:
            property_id: Property identifier
            
        Returns:
            List of predictions for each asset
        """
        history = self.load_maintenance_history(property_id)
        
        # Get unique assets from history
        assets = {}
        for record in history:
            asset_id = record['asset_id']
            if asset_id not in assets:
                assets[asset_id] = {
                    'asset_id': asset_id,
                    'asset_name': record['asset_name'],
                    'asset_type': record['asset_type']
                }
        
        # If no history found, return empty list (will use default intervals in predict_next_maintenance)
        if not assets:
            print(f"⚠ No assets found in maintenance history for property {property_id}")
            print(f"  History file exists but contains no valid asset records")
            return []
        
        predictions = []
        for asset_info in assets.values():
            try:
                prediction = self.predict_next_maintenance(
                    property_id,
                    asset_info['asset_id'],
                    asset_info['asset_type']
                )
                prediction.update(asset_info)
                predictions.append(prediction)
            except Exception as e:
                print(f"Error predicting for asset {asset_info['asset_id']}: {e}")
                continue
        
        print(f"Generated {len(predictions)} predictions for property {property_id}")
        return predictions
    
    def add_maintenance_record(
        self, 
        property_id: str, 
        asset_id: str,
        asset_name: str,
        asset_type: str,
        maintenance_date: str,
        maintenance_type: str = 'maintenance'
    ) -> bool:
        """
        Add a new maintenance record to the history file
        
        Args:
            property_id: Property identifier
            asset_id: Asset identifier
            asset_name: Asset name
            asset_type: Asset type
            maintenance_date: Date in YYYY-MM-DD format
            maintenance_type: Type of maintenance (installation, maintenance, repair)
            
        Returns:
            True if successful
        """
        history_file = self.data_dir / f"{property_id}_maintenance_history.txt"
        
        # Create file if it doesn't exist
        if not history_file.exists():
            with open(history_file, 'w', encoding='utf-8') as f:
                f.write(f"# Maintenance History for {property_id}\n")
                f.write("# Format: asset_id|asset_name|asset_type|maintenance_date|maintenance_type\n\n")
        
        # Append new record
        with open(history_file, 'a', encoding='utf-8') as f:
            f.write(f"{asset_id}|{asset_name}|{asset_type}|{maintenance_date}|{maintenance_type}\n")
        
        # Clear cache for this property
        if property_id in self.history_cache:
            del self.history_cache[property_id]
        
        return True


# Global instance
_predictor_instance: Optional[MaintenancePredictor] = None

def get_predictor() -> MaintenancePredictor:
    """Get or create global predictor instance"""
    global _predictor_instance
    if _predictor_instance is None:
        _predictor_instance = MaintenancePredictor()
    return _predictor_instance

