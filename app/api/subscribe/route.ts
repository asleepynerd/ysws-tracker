import { NextResponse } from "next/server";
import fetch from "node-fetch";
import https from "https";

const WORKER_URL = "https://ysws-notifier.stupidthings.workers.dev"; // realistically if you're hosting this, you should keep this, but if you're able to host your own worker, vapid keys n everything, do that :thumbsup:

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

export async function POST(request: Request) {
  try {
    const subscription = await request.json();

    console.log("Sending subscription to worker:", subscription);

    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
      agent: httpsAgent,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Worker response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(
        `HTTP error! status: ${response.status}, body: ${errorText}`
      );
    }

    return NextResponse.json({
      status: "Success",
      message: "Subscription added.",
    });
  } catch (error) {
    console.error("Error storing subscription:", error);
    return NextResponse.json(
      { error: "Failed to store subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const subscription = await request.json();

    const response = await fetch(WORKER_URL, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscription),
      agent: httpsAgent,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return NextResponse.json({
      status: "Success",
      message: "Subscription removed.",
    });
  } catch (error) {
    console.error("Error removing subscription:", error);
    return NextResponse.json(
      { error: "Failed to remove subscription" },
      { status: 500 }
    );
  }
}
