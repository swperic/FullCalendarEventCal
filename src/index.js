import { sampleData } from "./sampleData";
import { Calendar } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import './style.css';

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
    
    // Handle different date formats in background events
    if (bgEvent.date) {
      // Single date field - create all-day event
      startDate = parseFileMakerDate(bgEvent.date + ' 12:00 AM');
      endDate = parseFileMakerDate(bgEvent.date + ' 11:59 PM');
    } else if (bgEvent.start) {
      // Traditional start/end format
      startDate = parseFileMakerDate(bgEvent.start);
      endDate = parseFileMakerDate(bgEvent.end);
    }
    
    console.log(`Background event ${bgEvent.name}: date=${bgEvent.date}, start=${startDate}, end=${endDate}`);
    
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
            backgroundEvents = parsedData.data.backgroundEvents.map(bgEvent => {
              let startDate, endDate;
              
              // Handle different date formats in background events
              if (bgEvent.date) {
                // Single date field - create all-day event
                startDate = parseFileMakerDate(bgEvent.date + ' 12:00 AM');
                endDate = parseFileMakerDate(bgEvent.date + ' 11:59 PM');
              } else if (bgEvent.start) {
                // Traditional start/end format
                startDate = parseFileMakerDate(bgEvent.start);
                endDate = parseFileMakerDate(bgEvent.end);
              }
              
              return {
                id: `bg-${bgEvent.entityId || bgEvent.id || Math.random()}`,
                title: bgEvent.name || bgEvent.title || '',
                start: startDate,
                end: endDate,
                display: 'background',
                backgroundColor: bgEvent.color || '#ffebee', // Light red default
                borderColor: 'transparent',
                allDay: true,
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
            }).filter(event => event.start);
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
            backgroundEvents = parsedData.backgroundEvents.map(bgEvent => {
              let startDate, endDate;
              
              if (bgEvent.date) {
                startDate = parseFileMakerDate(bgEvent.date + ' 12:00 AM');
                endDate = parseFileMakerDate(bgEvent.date + ' 11:59 PM');
              } else if (bgEvent.start) {
                startDate = parseFileMakerDate(bgEvent.start);
                endDate = parseFileMakerDate(bgEvent.end);
              }
              
              return {
                id: `bg-${bgEvent.entityId || bgEvent.id || Math.random()}`,
                title: bgEvent.name || bgEvent.title || '',
                start: startDate,
                end: endDate,
                display: 'background',
                backgroundColor: bgEvent.color || '#ffebee', // Light red default
                borderColor: 'transparent',
                allDay: true,
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
            }).filter(event => event.start);
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
        events = sampleData.events || sampleData;
        backgroundEvents = processBackgroundEvents(sampleData.backgroundEvents || []);
      }
    } else {
      // Default to sample data
      events = sampleData.events || sampleData;
      backgroundEvents = processBackgroundEvents(sampleData.backgroundEvents || []);
    }
    
    // Combine regular events and background events
    const allEvents = [...events, ...backgroundEvents];
    
    const calendar = new Calendar(calendarEl, {
      plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      initialDate: '2025-07-01', // Start viewing July 2025
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,timeGridWeek,timeGridDay'
      },
      events: allEvents,
      editable: true,
      selectable: false,
      selectMirror: false,
      dayMaxEvents: false, // Don't limit events - let cells expand
      weekends: true,
      eventDisplay: 'block',
      height: '100vh', // Use full viewport height
      aspectRatio: null, // Disable aspect ratio to fill container
      sizeToFit: true, // Automatically adjust to fit container
      fixedWeekCount: false, // Show only the weeks that belong to the month
      showNonCurrentDates: false, // Hide dates from other months
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
          const tooltipLines = [
            `🌅 ${event.title || 'Background Event'}`,
            ``,
            `📅 ${event.start ? event.start.toLocaleDateString() : 'N/A'}`,
            props.manager ? `👤 Manager: ${props.manager}` : '',
            props.status ? `📊 Status: ${props.status}` : '',
            props.type ? `🏷️ Type: ${props.type}` : ''
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
            `📊 Status: ${props.status || 'N/A'}`,
            `🔢 Status Number: ${props.statusNum || 'N/A'}`,
            `🏷️ Type: ${props.type || 'N/A'}`,
            `📝 Entity: ${props.entityType || 'N/A'}`
          ];
          
          // Add Entity ID if available (useful for debugging/reference)
          if (event.id) {
            tooltipLines.push(`🔖 ID: ${event.id}`);
          }
          
          info.el.title = tooltipLines.join('\n');
          
          // Optional: Add custom CSS class for styling
          info.el.classList.add('fc-event-with-tooltip');
        }
      }
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
          backgroundEvents = parsedData.data.backgroundEvents.map(bgEvent => {
            let startDate, endDate;
            
            if (bgEvent.date) {
              startDate = parseFileMakerDate(bgEvent.date + ' 12:00 AM');
              endDate = parseFileMakerDate(bgEvent.date + ' 11:59 PM');
            } else if (bgEvent.start) {
              startDate = parseFileMakerDate(bgEvent.start);
              endDate = parseFileMakerDate(bgEvent.end);
            }
            
            return {
              id: `bg-${bgEvent.entityId || bgEvent.id || Math.random()}`,
              title: bgEvent.name || bgEvent.title || '',
              start: startDate,
              end: endDate,
              display: 'background',
              backgroundColor: bgEvent.color || '#ffebee', // Light red default
              borderColor: 'transparent',
              allDay: true,
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
          }).filter(event => event.start);
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
          backgroundEvents = parsedData.backgroundEvents.map(bgEvent => {
            let startDate, endDate;
            
            if (bgEvent.date) {
              startDate = parseFileMakerDate(bgEvent.date + ' 12:00 AM');
              endDate = parseFileMakerDate(bgEvent.date + ' 11:59 PM');
            } else if (bgEvent.start) {
              startDate = parseFileMakerDate(bgEvent.start);
              endDate = parseFileMakerDate(bgEvent.end);
            }
            
            return {
              id: `bg-${bgEvent.entityId || bgEvent.id || Math.random()}`,
              title: bgEvent.name || bgEvent.title || '',
              start: startDate,
              end: endDate,
              display: 'background',
              backgroundColor: bgEvent.color || '#ffebee', // Light red default
              borderColor: 'transparent',
              allDay: true,
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
          }).filter(event => event.start);
        }
      }
    }
    
    const allEvents = [...events, ...backgroundEvents];
    window.calendar.removeAllEvents();
    window.calendar.addEventSource(allEvents);
  }
};

window.updateEvents = function(events) {
  if (window.calendar) {
    const eventArray = Array.isArray(events) ? events : JSON.parse(events);
    eventArray.forEach(event => {
      const existingEvent = window.calendar.getEventById(event.id);
      if (existingEvent) {
        existingEvent.setProp('title', event.title);
        existingEvent.setStart(event.start);
        existingEvent.setEnd(event.end);
      } else {
        window.calendar.addEvent(event);
      }
    });
  }
};

// Auto-initialize on page load for development
document.addEventListener('DOMContentLoaded', function() {
  // Auto-load with sample data if no FileMaker integration
  if (!window.calendar) {
    window.loadWidget();
  }
});

// Test function for your actual data
window.testWithActualData = function() {
  const testData = {"data":{"backgroundEvents":[{"date":"7/18/2025","entityType":"DateWarning","name":"Busy. Don't book without double checking","entityId":"314669570948071982666987544629946022680828379932291085466"},{"date":"7/17/2025","entityType":"DateWarning","name":"Busy. Don't book without double checking","entityId":"799815592121091030110985870147981645992476460622971007954"},{"date":"7/19/2025","entityType":"DateWarning","name":"Busy. Don't book without double checking","entityId":"4576316715016125794792509174652648271912678109019545596385"}],"events":[{"end":"8/2/2025 11:59 PM","entityType":"EventDay","manager":"Cory Wetzell","name":"Progressive Life Giving Word Anniversary","start":"8/2/2025 12:00 AM","status":"Confirmed","statusNum":2,"type":"Event","entityId":"923366821674710778378996956968353462366054957006914681376"},{"end":"7/9/2025 11:59 PM","entityType":"EventDay","manager":"Daniel Nickleski","name":"LITH Ribfest","start":"7/9/2025 12:00 AM","status":"Confirmed","statusNum":2,"type":"Event","entityId":"4376917958396236557100070809137938731440673609850874311049"},{"end":"8/15/2025 11:59 PM","entityType":"EventDay","manager":"Cory Wetzell","name":"SL100 Joliet","start":"8/15/2025 12:00 AM","status":"Date Hold","statusNum":1,"type":"Event","entityId":"2784554366648614489655582759088223612887734395028907632297"}]}};
  
  window.loadWidget(testData);
};
