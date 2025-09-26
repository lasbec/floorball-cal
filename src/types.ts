export interface Club {
  id: string;
  name: string;
  location: string;
  url: string;
}

export interface Team {
  id: string;
  name: string;
  logoUrl: string | null;
  club: Club;
  modus: string | null;
  league: string | null;
  url: string;
}

export interface Event {
  guestTeam: string;
  homeTeam: string;
  start: Date;
  end: Date;
  location: string;
  hostClub: string | null;
}
