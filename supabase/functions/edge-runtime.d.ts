/**
 * Tipagens só para IDE / tsc -p supabase/functions.
 * Runtime continua sendo Deno no deploy da Supabase Edge.
 */
/// <reference lib="dom" />

declare namespace Deno {
  const env: { get(key: string): string | undefined };
  function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.49.1" {
  import type {
    GenericSchema,
    SupabaseClient,
    SupabaseClientOptions,
  } from "@supabase/supabase-js";

  /**
   * Alinhado ao createClient público do pacote npm (tipos suficientes para esta função).
   */
  export function createClient<
    Database extends { public: GenericSchema } = {
      public: GenericSchema & { Views: {}; Functions: {}; Enums: {} };
    },
  >(
    supabaseUrl: string,
    supabaseKey: string,
    options?: SupabaseClientOptions<"public", Database>,
  ): SupabaseClient<Database>;
}
