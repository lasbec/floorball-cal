import { createEvents, DateArray, EventAttributes } from 'ics';
import { Event, Team } from './types';

function toDateArray(value: Date): DateArray {
  return [
    value.getFullYear(),
    value.getMonth() + 1,
    value.getDate(),
    value.getHours(),
    value.getMinutes(),
  ];
}

function buildDescription(event: Event): string {
  const parts: string[] = [`Heim: ${event.homeTeam}`, `Gast: ${event.guestTeam}`];

  if (event.hostClub) {
    parts.push(`Ausrichter: ${event.hostClub}`);
  }

  return parts.join('\n');
}

export function createCalendarFile(team: Team, events: Event[]): string {
  const icsEvents: EventAttributes[] = events.map((event, index) => ({
    title: `${event.homeTeam} vs. ${event.guestTeam}`,
    description: buildDescription(event),
    location: event.location,
    start: toDateArray(event.start),
    end: toDateArray(event.end),
    uid: `${team.id}-${index}@floorball-cal`,
    productId: 'floorball-cal',
  }));

  const { value, error } = createEvents(icsEvents);

  if (error) {
    throw error;
  }

  return value ?? '';
}
