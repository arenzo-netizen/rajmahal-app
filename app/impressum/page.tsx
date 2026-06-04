export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-amber-50">
      <header className="bg-white shadow-sm px-4 py-4">
        <a href="/" className="text-amber-700 font-medium text-sm">← Zurück zur Bestellung</a>
      </header>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6 text-gray-700">
        <h1 className="text-3xl font-bold text-amber-800">Impressum</h1>

        <section>
          <h2 className="text-lg font-semibold mb-2">Angaben gemäß § 5 TMG</h2>
          <p>
            <strong>Rajmahal Indisch Restaurant Schkeuditz</strong><br />
            Friedrich-Ebert-Straße 16<br />
            04435 Schkeuditz<br />
            Deutschland
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Inhaber</h2>
          <p>
            <em>[Name des Inhabers / der Inhaberin – bitte eintragen]</em>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Kontakt</h2>
          <p>
            Telefon: 0176 64 91 88 23<br />
            Festnetz: 034204 360529<br />
            E-Mail: <em>[E-Mail-Adresse eintragen]</em><br />
            Website: <a href="https://www.rajmahal-schkeuditz.de" className="text-amber-700 underline">www.rajmahal-schkeuditz.de</a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Umsatzsteuer-ID</h2>
          <p>
            Umsatzsteuer-Identifikationsnummer gemäß § 27a UStG:<br />
            <em>[USt-IdNr. oder Steuernummer eintragen]</em>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Verantwortlich für den Inhalt (§ 18 Abs. 2 MStV)</h2>
          <p>
            <em>[Name des Verantwortlichen]</em><br />
            Friedrich-Ebert-Straße 16<br />
            04435 Schkeuditz
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Streitschlichtung</h2>
          <p>
            Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
            <a href="https://ec.europa.eu/consumers/odr/" className="text-amber-700 underline" target="_blank" rel="noreferrer">
              https://ec.europa.eu/consumers/odr/
            </a>.
            Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-2">Haftungsausschluss</h2>
          <p className="text-sm text-gray-600">
            Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich.
          </p>
        </section>
      </div>
    </div>
  );
}
