import { corsHeaders } from "./cors.ts";
import { Resend } from "npm:resend@2.0.0";

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    
    if (!RESEND_API_KEY) {
       console.error("RESEND_API_KEY is missing in environment variables.");
       return new Response(JSON.stringify({ error: "Server configuration error: Missing Email API Key" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // Initialize Resend with trimmed key to avoid whitespace issues
    const resend = new Resend(RESEND_API_KEY.trim());

    const { email, quote, pdfUrl } = await req.json();

    if (!email || !quote || !pdfUrl) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data, error } = await resend.emails.send({
      from: 'Devis <onboarding@resend.dev>',
      to: [email],
      subject: `Votre devis de nettoyage pour ${quote.address}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #2563eb;">Votre devis est prêt !</h1>
          <p>Bonjour,</p>
          <p>Merci d'avoir utilisé notre outil d'estimation en ligne. Voici le récapitulatif de votre devis pour l'adresse :</p>
          <p><strong>${quote.address}</strong></p>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <ul style="list-style: none; padding: 0;">
              <li style="margin-bottom: 10px;">📏 <strong>Surface :</strong> ${quote.surfaceArea} m²</li>
              <li style="margin-bottom: 10px;">💧 <strong>Nettoyage haute pression :</strong> ${quote.pressureWashing.total.toFixed(2)} €</li>
              <li style="margin-bottom: 10px;">🛡️ <strong>Traitement enzymatique :</strong> ${quote.enzyme.total.toFixed(2)} €</li>
              <li style="margin-top: 15px; font-size: 1.2em; border-top: 1px solid #ccc; padding-top: 10px;">
                <strong>Total TTC : <span style="color: #2563eb;">${quote.total.toFixed(2)} €</span></strong>
              </li>
            </ul>
          </div>

          <p>Vous pouvez télécharger votre devis détaillé au format PDF en cliquant sur le bouton ci-dessous :</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${pdfUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Télécharger mon devis PDF
            </a>
          </div>

          <p style="font-size: 0.9em; color: #666;">
            Ce lien est valable indéfiniment. Si vous avez des questions, n'hésitez pas à nous répondre.
          </p>
          <p>Cordialement,<br>L'équipe NettoyagePro</p>
        </div>
      `
    });

    if (error) {
        console.error("Resend API error:", error);
        // Return specific error info if available
        return new Response(JSON.stringify({ error: error.message || error }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }

    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});