import path from 'node:path';
import express from 'express';
import { z } from 'zod';
import { createCalendarFile } from './calendar';
import { scrapeClubs, scrapeEvents, scrapeTeams } from './saisonManagerClient';
import { Club, Team } from './types';

const app = express();

const publicDirectory = path.join(__dirname, '..', 'public');

app.use(express.json());
app.use(express.static(publicDirectory));

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

const clubIdSchema = z.object({
  clubId: z.string().min(1),
});

const teamSelectionSchema = z.object({
  clubId: z.string().min(1),
  teamId: z.string().min(1),
});

function renderClubOptions(clubs: Club[]): string {
  return clubs
    .map((club) => `<option value="${club.id}">${club.name}</option>`)
    .join('');
}

function renderWorkflow(clubs: Club[]): string {
  const options = renderClubOptions(clubs);

  return `
    <section class="workflow">
      <form id="club-form" class="workflow__step">
        <label class="workflow__label" for="club">Verein</label>
        <select
          id="club"
          name="clubId"
          class="workflow__select"
          hx-get="/ui/teams"
          hx-target="#team-step"
          hx-trigger="change"
          hx-swap="outerHTML"
          aria-label="Verein auswählen"
        >
          <option value="" selected disabled>Bitte Verein auswählen</option>
          ${options}
        </select>
      </form>

      <div id="team-step" class="workflow__step workflow__step--inactive">
        <p class="workflow__hint">Bitte zunächst einen Verein wählen.</p>
      </div>

      <div id="download-step" class="workflow__actions workflow__step--inactive">
        <p class="workflow__hint">Team auswählen, um den Kalender zu laden.</p>
      </div>
    </section>
  `;
}

function renderTeamOptions(clubId: string, teams: Team[]): string {
  const options = teams
    .map((team) => `<option value="${team.id}">${team.name}</option>`)
    .join('');

  return `
    <div id="team-step" class="workflow__step">
      <form class="workflow__form">
        <label class="workflow__label" for="team">Team</label>
        <select
          id="team"
          name="teamId"
          class="workflow__select"
          hx-get="/ui/download"
          hx-target="#download-step"
          hx-trigger="change"
          hx-include="closest form"
          hx-swap="outerHTML"
          aria-label="Team auswählen"
        >
          <option value="" selected disabled>Bitte Team auswählen</option>
          ${options}
        </select>
        <input type="hidden" name="clubId" value="${clubId}" />
      </form>
    </div>
  `;
}

function renderDownloadSection(clubId: string, team: Team): string {
  return `
    <div id="download-step" class="workflow__actions">
      <p class="workflow__summary">Ausgewähltes Team: <strong>${team.name}</strong></p>
      <a
        class="workflow__download"
        href="/calendar.ics?clubId=${clubId}&teamId=${team.id}"
      >Kalender herunterladen</a>
    </div>
  `;
}

app.get('/health', (_request, response) => {
  const payload = healthResponseSchema.parse({ status: 'ok' });

  response.json(payload);
});

app.get('/api/clubs', async (_request, response) => {
  try {
    const clubs = await scrapeClubs();

    response.json(clubs);
  } catch (error) {
    console.error(error);
    response.status(502).json({ message: 'Konnte Vereine nicht laden.' });
  }
});

app.get('/api/clubs/:clubId/teams', async (request, response) => {
  try {
    const { clubId } = clubIdSchema.parse(request.params);
    const teams = await scrapeTeams(clubId);

    response.json(teams);
  } catch (error) {
    console.error(error);
    response.status(502).json({ message: 'Konnte Teams nicht laden.' });
  }
});

app.get('/api/clubs/:clubId/teams/:teamId/events', async (request, response) => {
  try {
    const { clubId, teamId } = teamSelectionSchema.parse(request.params);
    const events = await scrapeEvents(clubId, teamId);

    response.json(events);
  } catch (error) {
    console.error(error);
    response.status(502).json({ message: 'Konnte Spielplan nicht laden.' });
  }
});

app.get('/ui/workflow', async (_request, response) => {
  try {
    const clubs = await scrapeClubs();
    const markup = renderWorkflow(clubs);

    response.send(markup);
  } catch (error) {
    console.error(error);
    response.status(502).send('<p class="workflow__error">Konnte Vereine nicht laden.</p>');
  }
});

app.get('/ui/teams', async (request, response) => {
  try {
    const { clubId } = clubIdSchema.parse(request.query);
    const teams = await scrapeTeams(clubId);

    if (teams.length === 0) {
      response.send('<p class="workflow__hint">Keine Teams gefunden.</p>');

      return;
    }

    response.send(renderTeamOptions(clubId, teams));
  } catch (error) {
    console.error(error);
    response.status(400).send('<p class="workflow__error">Ungültige Anfrage.</p>');
  }
});

app.get('/ui/download', async (request, response) => {
  try {
    const { clubId, teamId } = teamSelectionSchema.parse(request.query);
    const teams = await scrapeTeams(clubId);
    const selectedTeam = teams.find((team) => team.id === teamId);

    if (!selectedTeam) {
      response.status(404).send('<p class="workflow__error">Team nicht gefunden.</p>');

      return;
    }

    response.send(renderDownloadSection(clubId, selectedTeam));
  } catch (error) {
    console.error(error);
    response.status(400).send('<p class="workflow__error">Ungültige Anfrage.</p>');
  }
});

app.get('/calendar.ics', async (request, response) => {
  try {
    const { clubId, teamId } = teamSelectionSchema.parse(request.query);
    const [teams, events] = await Promise.all([scrapeTeams(clubId), scrapeEvents(clubId, teamId)]);
    const selectedTeam = teams.find((team) => team.id === teamId);

    if (!selectedTeam) {
      response.status(404).json({ message: 'Team nicht gefunden.' });

      return;
    }

    const calendar = createCalendarFile(selectedTeam, events);
    const filename = `${selectedTeam.name.replace(/[^a-z0-9]+/gi, '-')}.ics`;

    response.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    response.send(calendar);
  } catch (error) {
    console.error(error);
    response.status(502).json({ message: 'Kalender konnte nicht erstellt werden.' });
  }
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
