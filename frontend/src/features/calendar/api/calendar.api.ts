/**
 * Calendar API - Calendar events management endpoints
 */

import { calendarApi } from '@/shared/lib/api-endpoints';

export type EventType = 'payment' | 'appointment' | 'follow_up' | 'meeting' | 'reminder' | 'other';
export type EventCategory = 'loan' | 'customer' | 'internal' | 'holiday';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay: boolean;
  eventType: EventType;
  category?: EventCategory;
  loanId?: string;
  customerId?: string;
  location?: string;
  attendees?: string[];
  recurring: boolean;
  recurrenceRule?: string;
  reminderMinutes?: number[];
  branchId?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventData {
  title: string;
  description?: string;
  startDate: string;
  endDate?: string;
  allDay?: boolean;
  eventType: EventType;
  category?: EventCategory;
  loanId?: string;
  customerId?: string;
  location?: string;
  attendees?: string[];
  recurring?: boolean;
  recurrenceRule?: string;
  reminderMinutes?: number[];
}

export interface UpdateEventData {
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  allDay?: boolean;
  eventType?: EventType;
  category?: EventCategory;
  loanId?: string;
  customerId?: string;
  location?: string;
  attendees?: string[];
  recurring?: boolean;
  recurrenceRule?: string;
  reminderMinutes?: number[];
}

export interface ListEventsParams {
  page?: number;
  limit?: number;
  branchId?: string;
  eventType?: EventType;
  category?: EventCategory;
  dateFrom?: string;
  dateTo?: string;
  loanId?: string;
  customerId?: string;
}

/**
 * List calendar events
 */
export const listEvents = async (params?: ListEventsParams) => {
  return calendarApi.list(params);
};

/**
 * Get event by ID
 */
export const getEventById = async (id: string) => {
  return calendarApi.getById(id);
};

/**
 * Create new event
 */
export const createEvent = async (data: CreateEventData) => {
  return calendarApi.create(data);
};

/**
 * Update event
 */
export const updateEvent = async (id: string, data: UpdateEventData) => {
  return calendarApi.update(id, data);
};

/**
 * Delete event
 */
export const deleteEvent = async (id: string) => {
  return calendarApi.delete(id);
};

/**
 * Get events for date range
 */
export const getEventsForDateRange = async (dateFrom: string, dateTo: string, branchId?: string) => {
  return calendarApi.list({ dateFrom, dateTo, branchId, limit: 1000 });
};

/**
 * Get upcoming events
 */
export const getUpcomingEvents = async (days: number = 7, branchId?: string) => {
  const dateFrom = new Date().toISOString();
  const dateTo = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  return calendarApi.list({ dateFrom, dateTo, branchId, limit: 100 });
};

// Export all calendar API functions
export const calendarApiService = {
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventsForDateRange,
  getUpcomingEvents,
};
