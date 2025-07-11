const sampleData = {
  events: [
    {
      id: '1',
      title: 'Sample Meeting',
      start: '2025-07-15T10:00:00',
      end: '2025-07-15T11:00:00',
      extendedProps: {
        manager: 'John Doe',
        status: 'Confirmed',
        type: 'Meeting',
        entityType: 'Event',
        statusNum: 0
      },
      backgroundColor: '#6c757d', // Gray
      borderColor: '#6c757d'
    },
    {
      id: '2',
      title: 'Sample Conference',
      start: '2025-07-20T14:00:00',
      end: '2025-07-20T16:00:00',
      extendedProps: {
        manager: 'Jane Smith',
        status: 'Paid',
        type: 'Conference',
        entityType: 'Event',
        statusNum: 1
      },
      backgroundColor: '#fd7e14', // Orange
      borderColor: '#fd7e14'
    },
    {
      id: '3',
      title: 'Team Workshop',
      start: '2025-07-25T09:00:00',
      end: '2025-07-25T17:00:00',
      extendedProps: {
        manager: 'Bob Johnson',
        status: 'Scheduled',
        type: 'Workshop',
        entityType: 'Event',
        statusNum: 0
      },
      backgroundColor: '#6c757d', // Gray
      borderColor: '#6c757d'
    }
  ],
  backgroundEvents: [
    {
      uuid: 'bg-1',
      name: 'Company Holiday',
      start: '7/4/2025 12:00 AM',
      end: '7/5/2025 12:00 AM',
      manager: 'HR Department',
      status: 'Active',
      type: 'Holiday',
      entityType: 'Background',
      statusNum: 0,
      color: '#ffebee' // Light red for holidays
    },
    {
      uuid: 'bg-2',
      name: 'Office Maintenance',
      start: '7/15/2025 6:00 PM',
      end: '7/16/2025 8:00 AM',
      manager: 'Facilities Team',
      status: 'Scheduled',
      type: 'Maintenance',
      entityType: 'Background',
      statusNum: 0,
      color: '#fff3e0' // Light orange for maintenance
    },
    {
      uuid: 'bg-3',
      name: 'All Hands Week',
      start: '7/22/2025 12:00 AM',
      end: '7/27/2025 12:00 AM',
      manager: 'Executive Team',
      status: 'Confirmed',
      type: 'Company Event',
      entityType: 'Background',
      statusNum: 1,
      color: '#e8f5e8' // Light green for company events
    }
  ]
};

export { sampleData };
