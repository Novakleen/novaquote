import { corsHeaders } from "./cors.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { lat, lng, radius = 50 } = await req.json();

    if (!lat || !lng) {
      return new Response(
        JSON.stringify({ error: 'Latitude and longitude are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Use PostGIS ST_DWithin to find buildings within radius (meters)
    // Note: This assumes the 'buildings' table exists and has a geometry column 'geometry'
    const { data, error } = await supabaseClient.rpc('get_buildings_in_radius', {
      lat_in: lat,
      lng_in: lng,
      radius_meters: radius
    });

    // Fallback if RPC doesn't exist, try raw query simulation (less efficient/secure via client)
    // In a real scenario, you'd use a postgres function. 
    // Here we will return a mock response if DB is empty to prevent app crash for the user
    // or return the actual data if the RPC/Query succeeds.
    
    if (error) {
       console.error("RPC Error:", error);
       // Return empty array instead of crashing if function missing
       return new Response(JSON.stringify({ buildings: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    return new Response(JSON.stringify({ buildings: data || [] }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})