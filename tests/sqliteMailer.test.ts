import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { SMTPServer } from "smtp-server";
import { NodemailerSqliteMailer } from "../src/platform/adapters/sqlite/SqliteMailer";

interface CapturedEmail {
  raw: string;
  recipients: string[];
}

interface StartedSmtpServer {
  port: number;
  messages: CapturedEmail[];
  close: () => Promise<void>;
}

async function startSmtpServer(): Promise<StartedSmtpServer> {
  const messages: CapturedEmail[] = [];
  const server = new SMTPServer({
    authOptional: true,
    disabledCommands: ["AUTH", "STARTTLS"],
    onData(stream, session, callback) {
      let raw = "";
      stream.on("data", (chunk) => {
        raw += chunk.toString();
      });
      stream.on("end", () => {
        messages.push({
          raw,
          recipients: session.envelope.rcptTo.map((recipient) => recipient.address)
        });
        callback();
      });
      stream.on("error", (error) => callback(error));
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, "127.0.0.1", (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

  const address = server.server.address();
  if (!address || typeof address === "string") {
    throw new Error("Unable to resolve SMTP server address.");
  }

  return {
    port: (address as AddressInfo).port,
    messages,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      })
  };
}

test("SQLite mailer sends an email through SMTP", async () => {
  const smtp = await startSmtpServer();

  try {
    const mailer = new NodemailerSqliteMailer({
      host: "127.0.0.1",
      port: smtp.port,
      secure: false,
      fromAddress: "noreply@bank.local",
      connectionTimeoutMs: 1000
    });

    await mailer.send({
      to: "owner@bank.local",
      subject: "Correspondence BANK-HQ-OPS-202604-000001 received",
      text: "Reference: BANK-HQ-OPS-202604-000001"
    });

    assert.equal(smtp.messages.length, 1);
    assert.deepEqual(smtp.messages[0]?.recipients, ["owner@bank.local"]);
    assert.match(smtp.messages[0]?.raw ?? "", /Subject: Correspondence .* received/);
    assert.match(smtp.messages[0]?.raw ?? "", /Reference: BANK-/);
  } finally {
    await smtp.close();
  }
});

test("SQLite mailer throws when SMTP endpoint is unavailable", async () => {
  const mailer = new NodemailerSqliteMailer({
    host: "127.0.0.1",
    port: 1,
    secure: false,
    fromAddress: "noreply@bank.local",
    connectionTimeoutMs: 300
  });

  await assert.rejects(() =>
    mailer.send({
      to: "owner@bank.local",
      subject: "Should fail",
      text: "SMTP offline"
    })
  );
});
