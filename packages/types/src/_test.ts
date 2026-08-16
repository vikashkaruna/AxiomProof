import { z } from 'zod';
const S = z.object({
  a: z.string(),
  b: z.array(z.string()).optional().default([]),
});
type T = z.infer<typeof S>;
const x: T = { a: 'hi' };
console.log(x);
