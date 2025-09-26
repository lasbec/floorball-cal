import express from 'express';
import { z } from 'zod';

const app = express();

app.use(express.json());

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

const healthResponseSchema = z.object({
  status: z.literal('ok'),
});

app.get('/health', (_request, response) => {
  const payload = healthResponseSchema.parse({ status: 'ok' });

  response.json(payload);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export default app;
