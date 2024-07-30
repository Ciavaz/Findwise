import { LangfuseWeb } from 'langfuse';

const langfuseWeb = new LangfuseWeb({
    publicKey: process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY,
  });
  
export async function trackClick(trace_id: string, value: number) {
    await langfuseWeb.score({
        traceId: trace_id,
        name: "click",
        value,
    });
};