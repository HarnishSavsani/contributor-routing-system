import { Response } from 'express';

interface Client {
  id: string;
  res: Response;
}

class EventStreamManager {
  private clients: Map<string, Response> = new Map();

  addClient(id: string, res: Response) {
    this.clients.set(id, res);

    // Initial greeting / keepalive
    res.write(`data: ${JSON.stringify({ type: 'CONNECTED', clientId: id, timestamp: new Date().toISOString() })}\n\n`);

    // Clean up when connection closes
    res.on('close', () => {
      this.clients.delete(id);
    });
  }

  broadcast(type: string, data: any) {
    const payload = `data: ${JSON.stringify({ type, data, timestamp: new Date().toISOString() })}\n\n`;
    for (const [id, res] of this.clients.entries()) {
      try {
        res.write(payload);
      } catch (err) {
        console.error(`Failed to send event to client ${id}:`, err);
        this.clients.delete(id);
      }
    }
  }

  getConnectedCount(): number {
    return this.clients.size;
  }
}

export const eventStream = new EventStreamManager();

