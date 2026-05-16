import PublicLayout from "@/components/PublicLayout";

const Datenschutz = () => {
  return (
    <PublicLayout>
      <div className="min-h-[70vh] py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-white/40 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
            <div className="bg-gradient-to-r from-green-600/10 to-blue-600/10 p-8 border-b border-white/20">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                Datenschutzerklärung
              </h1>
              <p className="text-gray-600 mt-2">Informationen zum Schutz Ihrer Daten</p>
            </div>
            
            <div className="p-8 lg:p-12 space-y-12 text-gray-700 leading-relaxed">
              {/* General Info */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="h-8 w-1.5 bg-blue-600 rounded-full"></span>
                  1. Datenschutz auf einen Blick
                </h2>
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-gray-800">Allgemeine Hinweise</h3>
                  <p>
                    Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
                  </p>
                  <h3 className="text-lg font-bold text-gray-800 mt-6">Datenerfassung auf dieser Website</h3>
                  <p>
                    Die Datenverarbeitung auf dieser Website erfolgt durch den Websitebetreiber. Dessen Kontaktdaten können Sie dem Impressum dieser Website entnehmen.
                  </p>
                </div>
              </section>

              {/* Hosting */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="h-8 w-1.5 bg-green-600 rounded-full"></span>
                  2. Hosting und Content Delivery Networks (CDN)
                </h2>
                <p>
                  Wir hosten die Inhalte unserer Website bei folgendem Anbieter:
                </p>
                <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 italic">
                  Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, USA
                </div>
                <p className="mt-4">
                  Details entnehmen Sie der Datenschutzerklärung von Vercel: <a href="https://vercel.com/legal/privacy-policy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://vercel.com/legal/privacy-policy</a>.
                </p>
              </section>

              {/* Rights */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="h-8 w-1.5 bg-blue-600 rounded-full"></span>
                  3. Ihre Rechte
                </h2>
                <p>
                  Sie haben jederzeit das Recht, unentgeltlich Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten personenbezogenen Daten zu erhalten. Sie haben außerdem ein Recht, die Berichtigung oder Löschung dieser Daten zu verlangen.
                </p>
                <ul className="list-disc pl-6 mt-4 space-y-2">
                  <li>Recht auf Auskunft (Art. 15 DSGVO)</li>
                  <li>Recht auf Berichtigung (Art. 16 DSGVO)</li>
                  <li>Recht auf Löschung (Art. 17 DSGVO)</li>
                  <li>Recht auf Einschränkung der Verarbeitung (Art. 18 DSGVO)</li>
                  <li>Recht auf Datenübertragbarkeit (Art. 20 DSGVO)</li>
                  <li>Recht auf Widerspruch (Art. 21 DSGVO)</li>
                </ul>
              </section>

              {/* Encryption */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="h-8 w-1.5 bg-green-600 rounded-full"></span>
                  4. SSL- bzw. TLS-Verschlüsselung
                </h2>
                <p>
                  Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte, wie zum Beispiel Bestellungen oder Anfragen, die Sie an uns als Seitenbetreiber senden, eine SSL- bzw. TLS-Verschlüsselung. Eine verschlüsselte Verbindung erkennen Sie daran, dass die Adresszeile des Browsers von „http://“ auf „https://“ wechselt und an dem Schloss-Symbol in Ihrer Browserzeile.
                </p>
              </section>

              {/* Analysis */}
              <section>
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <span className="h-8 w-1.5 bg-blue-600 rounded-full"></span>
                  5. Analyse-Tools und Tools von Drittanbietern
                </h2>
                <p>
                  Beim Besuch dieser Website kann Ihr Surf-Verhalten statistisch ausgewertet werden. Das geschieht vor allem mit sogenannten Analyseprogrammen.
                </p>
                <p className="mt-4">
                  Wir setzen auf dieser Website keine Tracking-Cookies ohne Ihre explizite Einwilligung ein.
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default Datenschutz;
