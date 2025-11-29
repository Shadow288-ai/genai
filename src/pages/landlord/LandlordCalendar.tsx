import React, { useState } from "react";
import type { User, CalendarEvent } from "../../types";
import {
  mockCalendarEvents,
  mockProperties,
} from "../../services/mockData";

interface LandlordCalendarProps {
  user: User;
}

const LandlordCalendar: React.FC<LandlordCalendarProps> = ({ user }) => {
  const [view, setView] = useState<"month" | "week" | "list">("month");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedDate] = useState<Date>(new Date());

  const properties = mockProperties.filter((p) => p.landlordId === user.id);
  const allEvents = mockCalendarEvents.filter((e) =>
    selectedProperty === "all"
      ? properties.some((p) => p.id === e.propertyId)
      : e.propertyId === selectedProperty
  );

  const getPropertyName = (propertyId: string) => {
    return properties.find((p) => p.id === propertyId)?.name || "Unknown";
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      datetime: date,
    };
  };

  const getEventColor = (event: CalendarEvent) => {
    if (event.type === "STAY") return "blue";
    if (event.type === "MAINTENANCE") return "orange";
    if (event.type === "CHECK_WINDOW") return event.isAISuggested ? "purple" : "gray";
    return "gray";
  };

  const getEventIcon = (event: CalendarEvent) => {
    if (event.type === "STAY") return "🏠";
    if (event.type === "MAINTENANCE") return "🔧";
    if (event.type === "CHECK_WINDOW") return "🔍";
    return "📅";
  };

  // Group events by date for month view
  const eventsByDate = allEvents.reduce((acc, event) => {
    const date = new Date(event.startTime).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Calendar</h2>
        <div className="calendar-controls">
          <div className="view-toggle">
            <button
              className={view === "month" ? "active" : ""}
              onClick={() => setView("month")}
            >
              Month
            </button>
            <button
              className={view === "week" ? "active" : ""}
              onClick={() => setView("week")}
            >
              Week
            </button>
            <button
              className={view === "list" ? "active" : ""}
              onClick={() => setView("list")}
            >
              List
            </button>
          </div>
          <select
            className="form-input"
            value={selectedProperty}
            onChange={(e) => setSelectedProperty(e.target.value)}
          >
            <option value="all">All Properties</option>
            {properties.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {view === "list" ? (
        <div className="calendar-list-view">
          {allEvents
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .map((event) => {
              const { date, time } = formatDateTime(event.startTime);
              return (
                <div key={event.id} className="card calendar-event-card">
                  <div className="event-icon">{getEventIcon(event)}</div>
                  <div className="event-content">
                    <div className="event-header">
                      <h4>{event.title}</h4>
                      <span className={`status-badge ${event.status}`}>{event.status}</span>
                      {event.isAISuggested && (
                        <span className="badge ai-suggested">AI Suggested</span>
                      )}
                    </div>
                    <p className="text-muted">{getPropertyName(event.propertyId)}</p>
                    <div className="event-details">
                      <span>📅 {date}</span>
                      <span>🕐 {time}</span>
                    </div>
                    {event.description && (
                      <p className="event-description">{event.description}</p>
                    )}
                  </div>
                  <div className="event-actions">
                    {event.status === "proposed" && (
                      <>
                        <button className="btn-primary btn-sm">Confirm</button>
                        <button className="btn-secondary btn-sm">Modify</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      ) : (
        <div className="card card-large calendar-month-view">
          <div className="calendar-grid">
            {/* Simplified month view - in production, use a proper calendar library */}
            <div className="calendar-header">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>
            <div className="calendar-days">
              {Array.from({ length: 35 }).map((_, i) => {
                const date = new Date(selectedDate);
                date.setDate(1);
                date.setDate(date.getDate() - date.getDay() + i);
                const dateStr = date.toDateString();
                const dayEvents = eventsByDate[dateStr] || [];

                return (
                  <div key={i} className="calendar-day">
                    <div className="day-number">{date.getDate()}</div>
                    <div className="day-events">
                      {dayEvents.slice(0, 3).map((event) => (
                        <div
                          key={event.id}
                          className={`event-dot ${getEventColor(event)}`}
                          title={event.title}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="event-dot more">+{dayEvents.length - 3}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="card calendar-legend">
        <h4>Legend</h4>
        <div className="legend-items">
          <div className="legend-item">
            <div className="event-dot blue"></div>
            <span>Stays</span>
          </div>
          <div className="legend-item">
            <div className="event-dot orange"></div>
            <span>Maintenance</span>
          </div>
          <div className="legend-item">
            <div className="event-dot purple"></div>
            <span>AI Suggested Checks</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandlordCalendar;

