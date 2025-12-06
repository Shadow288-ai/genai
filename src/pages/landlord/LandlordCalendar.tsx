import React, { useState, useEffect } from "react";
import type { User, CalendarEvent } from "../../types";
import {
  mockProperties,
} from "../../services/mockData";
import { apiService } from "../../services/api";
import CalendarEventDetailModal from "../../components/calendar/CalendarEventDetailModal";

interface LandlordCalendarProps {
  user: User;
}

const LandlordCalendar: React.FC<LandlordCalendarProps> = ({ user }) => {
  const [view, setView] = useState<"month" | "week" | "list">("month");
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState<CalendarEvent[] | null>(null);

  const properties = mockProperties.filter((p) => p.landlordId === user.id);

  // Load calendar events from backend
  useEffect(() => {
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const propertyId = selectedProperty === "all" ? undefined : selectedProperty;
        const response = await apiService.getAllCalendarEvents(propertyId);
        
        const loadedEvents: CalendarEvent[] = response.events.map((e: any) => ({
          id: e.id,
          propertyId: e.property_id,
          type: e.type as any,
          title: e.title,
          startTime: e.start_time,
          endTime: e.end_time,
          status: e.status as any,
          tenantId: e.tenant_id,
          assetId: e.asset_id,
          incidentId: e.incident_id,
          isAISuggested: e.is_ai_suggested || false,
          description: e.description,
        }));
        
        setEvents(loadedEvents);
      } catch (error) {
        console.error("Failed to load calendar events:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, [selectedProperty]);

  const allEvents = events.filter((e) =>
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

  const eventsByDate = allEvents.reduce((acc, event) => {
    const date = new Date(event.startTime).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  // Navigation functions
  const goToPreviousMonth = () => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() - 1);
      return newDate;
    });
  };

  const goToNextMonth = () => {
    setSelectedDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + 1);
      return newDate;
    });
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const getMonthYear = () => {
    return selectedDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

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

      {isLoading ? (
        <div className="empty-state">
          <p>Loading calendar events...</p>
        </div>
      ) : view === "list" ? (
        <div className="calendar-list-view">
          {allEvents.length === 0 ? (
            <div className="empty-state">
              <p>No calendar events found.</p>
            </div>
          ) : (
            allEvents
              .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
              .map((event) => {
              const { date, time } = formatDateTime(event.startTime);
              return (
                <div
                  key={event.id}
                  className="card calendar-event-card"
                  style={{ cursor: "pointer" }}
                  onClick={() => setSelectedEvent(event)}
                >
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
                        <button
                          className="btn-primary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          Confirm
                        </button>
                        <button
                          className="btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          Modify
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
              })
          )}
        </div>
      ) : (
        <div className="card card-large calendar-month-view">
          <div className="calendar-month-header">
            <div className="calendar-month-nav">
              <button className="btn-link" onClick={goToPreviousMonth}>
                ← Previous
              </button>
              <h3>{getMonthYear()}</h3>
              <button className="btn-link" onClick={goToNextMonth}>
                Next →
              </button>
            </div>
            <button className="btn-secondary btn-sm" onClick={goToToday}>
              Today
            </button>
          </div>
          <div className="calendar-grid">
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
                          className={`event-dot ${getEventColor(event)} clickable`}
                          title={event.title}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEvent(event);
                          }}
                          style={{ cursor: "pointer" }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div
                          className="event-dot more clickable"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDayEvents(dayEvents);
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                    {dayEvents.length > 0 && dayEvents.length <= 3 && (
                      <div
                        className="calendar-day-clickable"
                        onClick={() => {
                          if (dayEvents.length === 1) {
                            setSelectedEvent(dayEvents[0]);
                          } else {
                            setSelectedDayEvents(dayEvents);
                          }
                        }}
                      />
                    )}
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

      {selectedEvent && (
        <CalendarEventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}

      {selectedDayEvents && selectedDayEvents.length > 1 && (
        <div className="modal-overlay" onClick={() => setSelectedDayEvents(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Events on {new Date(selectedDayEvents[0].startTime).toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}</h2>
              <button className="btn-link" onClick={() => setSelectedDayEvents(null)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {selectedDayEvents.map((event) => (
                  <div
                    key={event.id}
                    className="card"
                    style={{ cursor: "pointer", padding: "16px" }}
                    onClick={() => {
                      setSelectedDayEvents(null);
                      setSelectedEvent(event);
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <span style={{ fontSize: "1.5rem" }}>{getEventIcon(event)}</span>
                      <div style={{ flex: 1 }}>
                        <h4 style={{ margin: "0 0 4px 0" }}>{event.title}</h4>
                        <p className="text-muted" style={{ margin: 0, fontSize: "0.875rem" }}>
                          {new Date(event.startTime).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })} - {new Date(event.endTime).toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <span className={`status-badge ${event.status}`}>{event.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandlordCalendar;

