import { load, CheerioAPI } from 'cheerio';
import { Club, Event, Team } from './types';
import { calculateDefaultEnd, parseGermanDateTime } from './utils/date';

const BASE_URL = 'https://saisonmanager.de';

function buildUrl(pathname: string): string {
  const url = new URL(pathname, BASE_URL);

  return url.toString();
}

async function fetchDocument(pathname: string): Promise<CheerioAPI> {
  const response = await fetch(buildUrl(pathname), {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
      'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
    },
  });

  if (!response.ok) {
    throw new Error(`Request to ${pathname} failed with status ${response.status}`);
  }

  const markup = await response.text();

  return load(markup);
}

function extractLastPathSegment(href: string | undefined): string | null {
  if (!href) {
    return null;
  }

  const normalizedHref = href.trim();
  if (normalizedHref.length === 0) {
    return null;
  }

  const url = normalizedHref.startsWith('http') ? new URL(normalizedHref) : new URL(normalizedHref, BASE_URL);
  const segments = url.pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return null;
  }

  return segments[segments.length - 1];
}

export async function scrapeClubs(): Promise<Club[]> {
  const $ = await fetchDocument('/');
  const collected = new Map<string, Club>();

  $('a[href*="/club"]').each((_, element) => {
    const anchor = $(element);
    const name = anchor.text().replace(/\s+/g, ' ').trim();
    const href = anchor.attr('href');
    const identifier = extractLastPathSegment(href);

    if (!identifier) {
      return;
    }

    if (name.length === 0) {
      return;
    }

    if (collected.has(identifier)) {
      return;
    }

    const club: Club = {
      id: identifier,
      name,
      location: '',
      url: buildUrl(`/club/${identifier}`),
    };

    collected.set(identifier, club);
  });

  return Array.from(collected.values()).sort((first, second) => first.name.localeCompare(second.name, 'de'));
}

export async function scrapeTeams(clubId: string): Promise<Team[]> {
  const $ = await fetchDocument(`/club/${clubId}`);
  const teams: Team[] = [];

  $('a[href*="/team"]').each((_, element) => {
    const anchor = $(element);
    const href = anchor.attr('href');
    const identifier = extractLastPathSegment(href);

    if (!identifier) {
      return;
    }

    const name = anchor.text().replace(/\s+/g, ' ').trim();

    if (name.length === 0) {
      return;
    }

    const logo = anchor.find('img').attr('src') ?? null;
    const infoContainer = anchor.closest('[data-team-info]');
    let modus: string | null = null;
    let league: string | null = null;

    if (infoContainer.length > 0) {
      const modusCandidate = infoContainer.find('[data-team-modus]').text().replace(/\s+/g, ' ').trim();
      const leagueCandidate = infoContainer.find('[data-team-league]').text().replace(/\s+/g, ' ').trim();

      modus = modusCandidate.length > 0 ? modusCandidate : null;
      league = leagueCandidate.length > 0 ? leagueCandidate : null;
    }

    const team: Team = {
      id: identifier,
      name,
      logoUrl: logo ? buildUrl(logo) : null,
      club: {
        id: clubId,
        name: '',
        location: '',
        url: buildUrl(`/club/${clubId}`),
      },
      modus,
      league,
      url: buildUrl(`/team/${identifier}`),
    };

    teams.push(team);
  });

  return teams.sort((first, second) => first.name.localeCompare(second.name, 'de'));
}

export async function scrapeEvents(clubId: string, teamId: string): Promise<Event[]> {
  const $ = await fetchDocument(`/club/${clubId}/team/${teamId}`);
  const events: Event[] = [];

  $('table tbody tr').each((_, element) => {
    const row = $(element);
    const columns = row.find('td');

    if (columns.length === 0) {
      return;
    }

    const dateText = columns.eq(0).text().replace(/\s+/g, ' ').trim();
    const timeText = columns.eq(1).text().replace(/\s+/g, ' ').trim();
    const homeTeam = columns.eq(2).text().replace(/\s+/g, ' ').trim();
    const guestTeam = columns.eq(3).text().replace(/\s+/g, ' ').trim();
    const location = columns.eq(4).text().replace(/\s+/g, ' ').trim();
    const hostClub = columns.eq(5).text().replace(/\s+/g, ' ').trim();

    if (dateText.length === 0 || timeText.length === 0 || homeTeam.length === 0 || guestTeam.length === 0) {
      return;
    }

    try {
      const start = parseGermanDateTime(`${dateText} ${timeText}`);
      const end = calculateDefaultEnd(start);

      const event: Event = {
        guestTeam,
        homeTeam,
        start,
        end,
        location,
        hostClub: hostClub.length > 0 ? hostClub : null,
      };

      events.push(event);
    } catch (error) {
      console.warn(`Failed to parse event row: ${(error as Error).message}`);
    }
  });

  return events;
}
