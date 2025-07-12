// import { sampleData } from "./sampleData";
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import './style.css';

// Global variable to store current event data for refetch
let currentEventData = null;

// Dynamic event source function for FullCalendar
function getEvents(fetchInfo, successCallback, failureCallback) {
  if (currentEventData) {
    console.log('Providing events from currentEventData:', currentEventData);
    successCallback(currentEventData);
  } else {
    console.log('No currentEventData available, providing empty array');
    successCallback([]);
  }
}

// Helper function to parse FileMaker date format
function parseFileMakerDate(dateString) {
  if (!dateString) return null;
  
  // Handle FileMaker date format: "M/d/yyyy h:mm a" or "M/d/yyyy h:mm PM/AM"
  // First try direct parsing
  let date = new Date(dateString);
  
  // If direct parsing fails, try manual parsing for FileMaker format
  if (isNaN(date.getTime())) {
    // Match patterns like "5/20/2026 11:59 PM" or "6/13/2025 12:00 PM"
    const match = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
    if (match) {
      const [, month, day, year, hour, minute, ampm] = match;
      let hour24 = parseInt(hour);
      
      if (ampm.toUpperCase() === 'PM' && hour24 !== 12) {
        hour24 += 12;
      } else if (ampm.toUpperCase() === 'AM' && hour24 === 12) {
        hour24 = 0;
      }
      
      date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hour24, parseInt(minute));
    }
  }
  
  return isNaN(date.getTime()) ? null : date.toISOString();
}

// Helper function to process background events
function processBackgroundEvents(backgroundEventsArray) {
  if (!Array.isArray(backgroundEventsArray)) return [];
  
  console.log('Processing background events:', backgroundEventsArray);
  
  const processedEvents = backgroundEventsArray.map(bgEvent => {
    let startDate, endDate;
    
    console.log(`Processing background event: ${bgEvent.name}`);
    console.log(`  Raw dateStart: ${bgEvent.dateStart}, Raw dateEnd: ${bgEvent.dateEnd}`);
    
    // Handle different date formats in background events
    if (bgEvent.date) {
      // Single date field - create all-day event
      startDate = parseFileMakerDate(bgEvent.date + ' 12:00 AM');
      endDate = parseFileMakerDate(bgEvent.date + ' 11:59 PM');
    } else if (bgEvent.dateStart) {
      // Start with dateStart
      startDate = parseFileMakerDate(bgEvent.dateStart + ' 12:00 AM');
      
      if (bgEvent.dateEnd && bgEvent.dateEnd.trim() !== '') {
        // Multi-day event - parse end date
        endDate = parseFileMakerDate(bgEvent.dateEnd + ' 11:59 PM');
        
        // CRITICAL: FullCalendar end dates are EXCLUSIVE
        // Add 1 day to make the event span correctly
        const tempEnd = new Date(endDate);
        tempEnd.setDate(tempEnd.getDate() + 1);
        endDate = tempEnd;
        
        console.log(`  Multi-day event: adjusted end date to ${endDate} (exclusive)`);
      } else {
        // Single day event - set end to next day (FullCalendar exclusive end)
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        
        console.log(`  Single day event: set end to ${endDate} (exclusive)`);
      }
    } else if (bgEvent.start) {
      // Traditional start/end format
      startDate = parseFileMakerDate(bgEvent.start);
      endDate = parseFileMakerDate(bgEvent.end);
    }
    
    console.log(`  Parsed start: ${startDate}`);
    console.log(`  Parsed end: ${endDate}`);
    
    // Determine if this is multi-day based on original dates
    const isMultiDay = bgEvent.dateEnd && bgEvent.dateEnd.trim() !== '' && 
                      bgEvent.dateStart !== bgEvent.dateEnd;
    console.log(`  Multi-day: ${isMultiDay}`);
    
    return {
      id: `bg-${bgEvent.entityId || bgEvent.id || Math.random()}`,
      title: bgEvent.name || bgEvent.title || '',
      start: startDate,
      end: endDate,
      display: 'background', // This makes it a background event
      backgroundColor: bgEvent.color || '#ffebee', // Light red default for DateWarning
      borderColor: 'transparent',
      allDay: true, // Make background events all-day
      interactive: true, // Allow clicks on background events
      extendedProps: {
        manager: bgEvent.manager,
        status: bgEvent.status,
        type: bgEvent.type,
        entityType: bgEvent.entityType,
        statusNum: bgEvent.statusNum,
        isBackground: true
      }
    };
  }).filter(event => event.start); // Filter out events with invalid dates
  
  console.log('Processed background events:', processedEvents);
  return processedEvents;
}

// this function is called by FileMaker.
window.loadWidget = function (data) {
  console.log("FileMaker called this function");
  
  // Initialize FullCalendar
  const calendarEl = document.getElementById('calendar');
  if (calendarEl) {
    let events = [];
    let backgroundEvents = [];
    
    if (data) {
      try {
        const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Handle different data formats
        if (parsedData.data && parsedData.data.events) {
          // Format: {"data": {"events": [...], "backgroundEvents": [...]}}
          events = parsedData.data.events.map(event => ({
            id: event.entityId,
            title: event.name,
            start: parseFileMakerDate(event.start),
            end: parseFileMakerDate(event.end),
            extendedProps: {
              manager: event.manager,
              status: event.status,
              type: event.type,
              entityType: event.entityType,
              statusNum: event.statusNum
            },
            backgroundColor: getEventColor(event.statusNum),
            borderColor: getEventColor(event.statusNum),
            textColor: getEventTextColor(event.statusNum)
          })).filter(event => event.start); // Filter out events with invalid dates
          
          // Process background events if they exist
          if (parsedData.data.backgroundEvents) {
            backgroundEvents = processBackgroundEvents(parsedData.data.backgroundEvents);
          }
        } else if (parsedData.events) {
          // Format: {"events": [...], "backgroundEvents": [...]}
          events = parsedData.events.map(event => ({
            id: event.entityId,
            title: event.name,
            start: parseFileMakerDate(event.start),
            end: parseFileMakerDate(event.end),
            extendedProps: {
              manager: event.manager,
              status: event.status,
              type: event.type,
              entityType: event.entityType,
              statusNum: event.statusNum
            },
            backgroundColor: getEventColor(event.statusNum),
            borderColor: getEventColor(event.statusNum),
            textColor: getEventTextColor(event.statusNum)
          })).filter(event => event.start); // Filter out events with invalid dates
          
          // Process background events if they exist
          if (parsedData.backgroundEvents) {
            backgroundEvents = processBackgroundEvents(parsedData.backgroundEvents);
          }
        } else if (Array.isArray(parsedData)) {
          // Format: [...]
          events = parsedData.map(event => ({
            id: event.entityId,
            title: event.name,
            start: parseFileMakerDate(event.start),
            end: parseFileMakerDate(event.end),
            extendedProps: {
              manager: event.manager,
              status: event.status,
              type: event.type,
              entityType: event.entityType,
              statusNum: event.statusNum
            },
            backgroundColor: getEventColor(event.statusNum),
            borderColor: getEventColor(event.statusNum),
            textColor: getEventTextColor(event.statusNum)
          })).filter(event => event.start); // Filter out events with invalid dates
        }
        
        console.log('Processed events:', events.length, events);
        console.log('Processed background events:', backgroundEvents.length, backgroundEvents);
      } catch (error) {
        console.error('Error parsing event data:', error);
        // events = sampleData.events || sampleData;
        // backgroundEvents = processBackgroundEvents(sampleData.backgroundEvents || []);
        events = [];
        backgroundEvents = [];
      }
    } else {
      // Default to empty data instead of sample data
      // events = sampleData.events || sampleData;
      // backgroundEvents = processBackgroundEvents(sampleData.backgroundEvents || []);
      events = [];
      backgroundEvents = [];
    }
    
    // Combine regular events and background events
    const allEvents = [...events, ...backgroundEvents];
    
    // Set initial event data for dynamic source
    currentEventData = allEvents;
    
    const calendar = new Calendar(calendarEl, {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      initialDate: '2025-07-01', // Start viewing July 2025
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      events: getEvents, // Use dynamic event source instead of static array
      editable: false, // Disable drag and drop of events
      selectable: false,
      selectMirror: false,
      dayMaxEvents: false, // Don't limit events - let cells expand
      weekends: true,
      eventDisplay: 'block',
      height: '100vh', // Use full viewport height
      aspectRatio: null, // Disable aspect ratio to fill container
      sizeToFit: true, // Automatically adjust to fit container
      fixedWeekCount: false, // Flexible week count (4-6 weeks depending on month)
      showNonCurrentDates: true, // Show dates from other months
      displayEventTime: false, // Remove times from event cells in month view
      eventClick: function(info) {
        // Prevent event from bubbling up to dateClick
        info.jsEvent.stopPropagation();
        
        // Handle event clicks for FileMaker integration
        const event = info.event;
        const props = event.extendedProps;
        
        console.log('Event clicked - Raw event:', event);
        console.log('Event clicked - ID:', event.id);
        console.log('Event clicked - Title:', event.title);
        console.log('Event clicked - Is Background:', props.isBackground);
        console.log('Event clicked - Entity Type:', props.entityType);
        console.log('Event clicked - Display type:', event.display);
        
        // Check if this is a background event
        if (props.isBackground || event.display === 'background') {
          console.log('Background event clicked');
          
          // Create data object for background event click
          const clickData = {
            entityId: event.id.replace('bg-', ''), // Remove bg- prefix
            entityType: props.entityType || 'BackgroundEvent'
          };
          
          console.log('Background event clicked, sending to FileMaker:', clickData);
          
          // Call the same FileMaker script as regular events
          if (window.FileMaker) {
            window.FileMaker.PerformScript('Event Calendar - Handle Click', JSON.stringify(clickData));
          } else {
            console.log('FileMaker not available, would call script with:', JSON.stringify(clickData));
          }
          return;
        }
        
        // Create data object to pass to FileMaker
        const clickData = {
          entityId: event.id.replace('bg-', ''), // Remove bg- prefix if it's a background event
          entityType: props.entityType || 'Event'
        };
        
        console.log('Regular event clicked, sending to FileMaker:', clickData);
        
        // Call FileMaker script if available
        if (window.FileMaker) {
          window.FileMaker.PerformScript('Event Calendar - Handle Click', JSON.stringify(clickData));
        } else {
          console.log('FileMaker not available, would call script with:', JSON.stringify(clickData));
        }
      },
      eventDidMount: function(info) {
        // Add comprehensive tooltip with event details
        const event = info.event;
        const props = event.extendedProps;
        
        // Different tooltip handling for background events
        if (props.isBackground) {
          // Simpler tooltip for background events
          const startDate = event.start ? event.start.toLocaleDateString() : 'N/A';
          const endDate = event.end ? event.end.toLocaleDateString() : 'N/A';
          
          const tooltipLines = [
            `🌅 ${event.title || 'Background Event'}`,
            ``,
            `📅 Start: ${startDate}`,
            event.end ? `📅 End: ${endDate}` : '',
            props.manager ? `👤 Manager: ${props.manager}` : '',
            props.status ? `📊 Status: ${props.status}` : ''
          ].filter(line => line !== ''); // Remove empty lines
          
          info.el.title = tooltipLines.join('\n');
          info.el.classList.add('fc-background-event-with-tooltip');
        } else {
          // Regular event tooltip (existing logic)
          // Format start and end dates for display
          const startDate = event.start ? event.start.toLocaleDateString() : 'N/A';
          const startTime = event.start ? event.start.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A';
          const endDate = event.end ? event.end.toLocaleDateString() : 'N/A';
          const endTime = event.end ? event.end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A';
          
          // Build comprehensive tooltip
          const tooltipLines = [
            `📅 ${event.title}`,
            ``,
            `🕐 Start: ${startDate} at ${startTime}`,
            `🕐 End: ${endDate} at ${endTime}`,
            ``,
            `👤 Manager: ${props.manager || 'N/A'}`,
            `📊 Status: ${props.status || 'N/A'}`
          ];
          
          info.el.title = tooltipLines.join('\n');
          
          // Optional: Add custom CSS class for styling
          info.el.classList.add('fc-event-with-tooltip');
        }
      },
      datesSet: function(dateInfo) {
        // Called when the calendar's date range changes (navigation)
        console.log('Calendar date range changed:', dateInfo);
        
        // Calculate the first date of the month
        const currentDate = dateInfo.start;
        const firstDateOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        
        // Format as mm/dd/yyyy
        const formattedDate = (firstDateOfMonth.getMonth() + 1).toString().padStart(2, '0') + '/' + 
                             firstDateOfMonth.getDate().toString().padStart(2, '0') + '/' + 
                             firstDateOfMonth.getFullYear();
        
        console.log('Calling FileMaker script with first date of month:', formattedDate);
        
        // Call FileMaker script
        if (window.FileMaker) {
          window.FileMaker.PerformScript('Event Calendar - handle dateSet', formattedDate);
        } else {
          console.log('FileMaker not available, would call script with:', formattedDate);
        }
      },
      eventSource: getEvents // Use dynamic event source function
    });
    
    calendar.render();
    
    // Store calendar instance globally for FileMaker integration
    window.calendar = calendar;
  }
};

// Helper function to assign colors based on event status number
function getEventColor(eventStatusNum) {
  // Color logic based on statusNum
  if (eventStatusNum === 1 || eventStatusNum === "1") {
    return '#fd7e14'; // Orange for quoted/date hold
  } else if (eventStatusNum === 2 || eventStatusNum === "2") {
    return '#e9ecef'; // Light grey for confirmed/paid/invoiced
  }
  return '#6c757d'; // Gray (default)
}

// Helper function to get text color based on event status number
function getEventTextColor(eventStatusNum) {
  if (eventStatusNum === 2 || eventStatusNum === "2") {
    return '#000000'; // Black text for light grey background
  }
  return '#ffffff'; // White text for other colors
}

// Additional FileMaker integration functions
window.setData = function(data) {
  if (window.calendar) {
    let events = [];
    let backgroundEvents = [];
    
    if (data) {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Handle regular events
      if (parsedData.data && parsedData.data.events) {
        events = parsedData.data.events.map(event => ({
          id: event.entityId || event.id,
          title: event.name || event.title,
          start: parseFileMakerDate(event.start),
          end: parseFileMakerDate(event.end),
          extendedProps: {
            manager: event.manager,
            status: event.status,
            type: event.type,
            entityType: event.entityType,
            statusNum: event.statusNum
          },
          backgroundColor: getEventColor(event.statusNum),
          borderColor: getEventColor(event.statusNum),
          textColor: getEventTextColor(event.statusNum)
        })).filter(event => event.start);
        
        // Handle background events
        if (parsedData.data.backgroundEvents) {
          backgroundEvents = processBackgroundEvents(parsedData.data.backgroundEvents);
        }
      } else if (parsedData.events || Array.isArray(parsedData)) {
        const eventData = parsedData.events || parsedData;
        events = eventData.map(event => ({
          id: event.entityId || event.id,
          title: event.name || event.title,
          start: parseFileMakerDate(event.start),
          end: parseFileMakerDate(event.end),
          extendedProps: {
            manager: event.manager,
            status: event.status,
            type: event.type,
            entityType: event.entityType,
            statusNum: event.statusNum
          },
          backgroundColor: getEventColor(event.statusNum),
          borderColor: getEventColor(event.statusNum),
          textColor: getEventTextColor(event.statusNum)
        })).filter(event => event.start);
        
        // Handle background events
        if (parsedData.backgroundEvents) {
          backgroundEvents = processBackgroundEvents(parsedData.backgroundEvents);
        }
      }
    }
    
    const allEvents = [...events, ...backgroundEvents];
    window.calendar.removeAllEvents();
    window.calendar.addEventSource(allEvents);
  }
};

window.updateEvents = function(payload) {
  if (window.calendar) {
    // Handle different payload formats
    if (typeof payload === 'string') {
      payload = JSON.parse(payload);
    }
    
    // Process regular events from payload
    if (payload.data && payload.data.events) {
      payload.data.events.forEach(event => {
        const eventId = event.entityId || event.id;
        const existingEvent = window.calendar.getEventById(eventId);
        
        if (event.deleted === true) {
          // Remove deleted events
          if (existingEvent) {
            existingEvent.remove();
          }
        } else {
          // Update or add regular event
          if (existingEvent) {
            // Update existing event properties
            existingEvent.setProp('title', event.name || event.title);
            existingEvent.setStart(parseFileMakerDate(event.dateStart || event.start));
            existingEvent.setEnd(parseFileMakerDate(event.dateEnd || event.end));
            
            // Update extended properties
            if (event.manager !== undefined) existingEvent.setExtendedProp('manager', event.manager);
            if (event.status !== undefined) existingEvent.setExtendedProp('status', event.status);
            if (event.type !== undefined) existingEvent.setExtendedProp('type', event.type);
            if (event.entityType !== undefined) existingEvent.setExtendedProp('entityType', event.entityType);
            if (event.statusNum !== undefined) {
              existingEvent.setExtendedProp('statusNum', event.statusNum);
              // Update colors based on statusNum
              existingEvent.setProp('backgroundColor', getEventColor(event.statusNum));
              existingEvent.setProp('borderColor', getEventColor(event.statusNum));
              existingEvent.setProp('textColor', getEventTextColor(event.statusNum));
            }
          } else {
            // Add new regular event
            const normalizedEvent = {
              id: eventId,
              title: event.name || event.title,
              start: parseFileMakerDate(event.dateStart || event.start),
              end: parseFileMakerDate(event.dateEnd || event.end),
              extendedProps: {
                manager: event.manager,
                status: event.status,
                type: event.type,
                entityType: event.entityType,
                statusNum: event.statusNum
              },
              backgroundColor: getEventColor(event.statusNum),
              borderColor: getEventColor(event.statusNum),
              textColor: getEventTextColor(event.statusNum)
            };
            window.calendar.addEvent(normalizedEvent);
          }
        }
      });
    }
    
    // Process background events from payload
    if (payload.data && payload.data.backgroundEvents) {
      // Use the same processBackgroundEvents function to ensure consistent bg- prefix
      const processedBgEvents = processBackgroundEvents(payload.data.backgroundEvents);
      
      processedBgEvents.forEach(normalizedBgEvent => {
        const bgEventId = normalizedBgEvent.id; // Already has bg- prefix from processBackgroundEvents
        const existingBgEvent = window.calendar.getEventById(bgEventId);
        
        // Check if this background event should be deleted
        const originalBgEvent = payload.data.backgroundEvents.find(bg => 
          `bg-${bg.entityId || bg.id}` === bgEventId
        );
        
        if (originalBgEvent && originalBgEvent.deleted === true) {
          // Remove deleted background events
          if (existingBgEvent) {
            existingBgEvent.remove();
          }
        } else {
          if (existingBgEvent) {
            // For background events, remove and re-add is more reliable
            existingBgEvent.remove();
            window.calendar.addEvent(normalizedBgEvent);
          } else {
            // Add new background event
            window.calendar.addEvent(normalizedBgEvent);
          }
        }
      });
    }
  }
};

window.updateData = function(data) {
  if (window.calendar) {
    let events = [];
    let backgroundEvents = [];
    
    if (data) {
      const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      
      // Handle regular events
      if (parsedData.data && parsedData.data.events) {
        events = parsedData.data.events.map(event => ({
          id: event.entityId || event.id,
          title: event.name || event.title,
          start: parseFileMakerDate(event.start),
          end: parseFileMakerDate(event.end),
          extendedProps: {
            manager: event.manager,
            status: event.status,
            type: event.type,
            entityType: event.entityType,
            statusNum: event.statusNum
          },
          backgroundColor: getEventColor(event.statusNum),
          borderColor: getEventColor(event.statusNum),
          textColor: getEventTextColor(event.statusNum)
        })).filter(event => event.start);
        
        // Handle background events
        if (parsedData.data.backgroundEvents) {
          backgroundEvents = processBackgroundEvents(parsedData.data.backgroundEvents);
        }
      } else if (parsedData.events || Array.isArray(parsedData)) {
        const eventData = parsedData.events || parsedData;
        events = eventData.map(event => ({
          id: event.entityId || event.id,
          title: event.name || event.title,
          start: parseFileMakerDate(event.start),
          end: parseFileMakerDate(event.end),
          extendedProps: {
            manager: event.manager,
            status: event.status,
            type: event.type,
            entityType: event.entityType,
            statusNum: event.statusNum
          },
          backgroundColor: getEventColor(event.statusNum),
          borderColor: getEventColor(event.statusNum),
          textColor: getEventTextColor(event.statusNum)
        })).filter(event => event.start);
        
        // Handle background events
        if (parsedData.backgroundEvents) {
          backgroundEvents = processBackgroundEvents(parsedData.backgroundEvents);
        }
      }
    }
    
    const allEvents = [...events, ...backgroundEvents];
    
    // Update or add events individually
    allEvents.forEach(newEvent => {
      const existingEvent = window.calendar.getEventById(newEvent.id);
      if (existingEvent) {
        // Update existing event
        console.log('Updating existing event:', newEvent.id);
        existingEvent.setProp('title', newEvent.title);
        existingEvent.setStart(newEvent.start);
        existingEvent.setEnd(newEvent.end);
        existingEvent.setProp('backgroundColor', newEvent.backgroundColor);
        existingEvent.setProp('borderColor', newEvent.borderColor);
        existingEvent.setProp('textColor', newEvent.textColor);
        existingEvent.setExtendedProp('manager', newEvent.extendedProps.manager);
        existingEvent.setExtendedProp('status', newEvent.extendedProps.status);
        existingEvent.setExtendedProp('type', newEvent.extendedProps.type);
        existingEvent.setExtendedProp('entityType', newEvent.extendedProps.entityType);
        existingEvent.setExtendedProp('statusNum', newEvent.extendedProps.statusNum);
        if (newEvent.extendedProps.isBackground) {
          existingEvent.setExtendedProp('isBackground', newEvent.extendedProps.isBackground);
        }
      } else {
        // Add new event
        console.log('Adding new event:', newEvent.id);
        window.calendar.addEvent(newEvent);
      }
    });
    
    console.log('Updated calendar with', allEvents.length, 'events');
  }
};

// Function to handle deleted events
window.removeEvent = function(eventId) {
  if (window.calendar) {
    const existingEvent = window.calendar.getEventById(eventId);
    if (existingEvent) {
      existingEvent.remove();
      console.log(`Removed event with ID: ${eventId}`);
    }
  }
};

// Function to handle multiple deleted events
window.removeEvents = function(eventIds) {
  if (window.calendar && Array.isArray(eventIds)) {
    eventIds.forEach(id => {
      const existingEvent = window.calendar.getEventById(id);
      if (existingEvent) {
        existingEvent.remove();
        console.log(`Removed event with ID: ${id}`);
      }
    });
  }
};

// Auto-initialize on page load for development
// document.addEventListener('DOMContentLoaded', function() {
//   // Auto-load with sample data if no FileMaker integration
//   if (!window.calendar) {
//     window.loadWidget();
//   }
// });

// Test function for your actual data

