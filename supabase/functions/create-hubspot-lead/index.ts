import { corsHeaders } from "./cors.ts";

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { address, phone_number } = await req.json();

    if (!address || !phone_number) {
      return new Response(JSON.stringify({ error: 'Address and phone number are required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    const HUBSPOT_ACCESS_TOKEN = Deno.env.get('HUBSPOT_ACCESS_TOKEN');
    if (!HUBSPOT_ACCESS_TOKEN) {
      throw new Error('HUBSPOT_ACCESS_TOKEN is not configured');
    }

    // Call HubSpot API to create contact
    const response = await fetch('https://api.hubapi.com/crm/v3/objects/contacts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          phone: phone_number,
          address: address,
          lastname: 'NovaQuote Visitor', // Generic name as we only have phone initially
          lifecyclestage: 'lead'
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      // Check for conflict (contact already exists)
      if (data.category === 'CONFLICT') {
         console.log("Contact already exists in HubSpot");
         return new Response(JSON.stringify({ 
           success: false, 
           error: 'Contact already exists',
           details: data
         }), {
           headers: { ...corsHeaders, 'Content-Type': 'application/json' },
           status: 200 
         });
      }

      throw new Error(`HubSpot API error: ${JSON.stringify(data)}`);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      hubspotId: data.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Error creating HubSpot lead:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
})