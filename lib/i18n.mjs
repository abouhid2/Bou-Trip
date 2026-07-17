// =====================================================================
// i18n.mjs — dicionários de UI e helpers de texto bilíngue.
// Inglês ("en") é sempre o fallback e a alternativa do toggle.
// =====================================================================

export const UI = {
  en: { cal: "Calendar", roteiro: "Itinerary", trans: "Transport", places: "Places", map: "Map", stays: "Lodging",
    checkIn: "Check-in", checkOut: "Check-out", conf: "Booking code", price: "Price", phone: "Phone",
    mkPlace: "places", mkStay: "lodging", mkStation: "stations/airports",
    showAll: "Show all", highlight: "highlight", move: "transfer", today: "Today", mapApp: "maps app", transfers: "Transfers",
    filterHint: 'Tap a city to see only it (applies to all tabs). "Show all" clears the filter.',
    flights: "Flights", moves: "Transfers along the trip", nights: "nights", base: "base", bases: "bases",
    theme: "Toggle dark mode", langAria: "Language", tabsAria: "Sections", filterAria: "Filter by city",
    mapFallback: "🗺️ The live map needs internet — with an eSIM/Wi-Fi it works right here, no app needed. For fully offline use, import the my-trip.kml file into a maps app (Organic Maps, Maps.me, OsmAnd…). The other tabs work offline.",
    wd: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    mon: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    wf: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] },
  pt: { cal: "Calendário", roteiro: "Roteiro", trans: "Transportes", places: "Lugares", map: "Mapa", stays: "Hospedagem",
    checkIn: "Check-in", checkOut: "Check-out", conf: "Reserva", price: "Preço", phone: "Telefone",
    mkPlace: "lugares", mkStay: "hospedagem", mkStation: "estações/aeroportos",
    showAll: "Mostrar tudo", highlight: "destaque", move: "deslocamento", today: "Hoje", mapApp: "app de mapa", transfers: "Deslocamentos",
    filterHint: 'Toque numa cidade para ver só ela (vale pras 5 abas). "Mostrar tudo" limpa o filtro.',
    flights: "Voos", moves: "Deslocamentos no roteiro", nights: "noites", base: "base", bases: "bases",
    theme: "Alternar modo escuro", langAria: "Idioma", tabsAria: "Seções", filterAria: "Filtrar por cidade",
    mapFallback: "🗺️ O mapa ao vivo precisa de internet — com eSIM/Wi-Fi funciona aqui mesmo, sem instalar nada. Só para usar 100% offline, importe o arquivo my-trip.kml num app de mapa (Organic Maps, Maps.me, OsmAnd…). As outras abas funcionam offline.",
    wd: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
    mon: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
    wf: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"] },
  es: { cal: "Calendario", roteiro: "Itinerario", trans: "Transportes", places: "Lugares", map: "Mapa", stays: "Alojamiento",
    checkIn: "Check-in", checkOut: "Check-out", conf: "Reserva", price: "Precio", phone: "Teléfono",
    mkPlace: "lugares", mkStay: "alojamiento", mkStation: "estaciones/aeropuertos",
    showAll: "Mostrar todo", highlight: "destacado", move: "traslado", today: "Hoy", mapApp: "app de mapas", transfers: "Traslados",
    filterHint: 'Toca una ciudad para ver solo esa (vale para las 5 pestañas). "Mostrar todo" limpia el filtro.',
    flights: "Vuelos", moves: "Traslados del viaje", nights: "noches", base: "base", bases: "bases",
    theme: "Alternar modo oscuro", langAria: "Idioma", tabsAria: "Secciones", filterAria: "Filtrar por ciudad",
    mapFallback: "🗺️ El mapa en vivo necesita internet — con eSIM/Wi-Fi funciona aquí mismo, sin instalar nada. Solo para uso 100% sin conexión, importa el archivo my-trip.kml en una app de mapas (Organic Maps, Maps.me, OsmAnd…). Las otras pestañas funcionan sin conexión.",
    wd: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    mon: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    wf: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"] },
  fr: { cal: "Calendrier", roteiro: "Itinéraire", trans: "Transports", places: "Lieux", map: "Carte", stays: "Hébergement",
    checkIn: "Arrivée", checkOut: "Départ", conf: "Réservation", price: "Prix", phone: "Téléphone",
    mkPlace: "lieux", mkStay: "hébergement", mkStation: "gares/aéroports",
    showAll: "Tout afficher", highlight: "incontournable", move: "trajet", today: "Aujourd’hui", mapApp: "appli de cartes", transfers: "Trajets",
    filterHint: 'Touchez une ville pour ne voir qu’elle (vaut pour les 5 onglets). "Tout afficher" réinitialise.',
    flights: "Vols", moves: "Trajets du voyage", nights: "nuits", base: "base", bases: "bases",
    theme: "Basculer le mode sombre", langAria: "Langue", tabsAria: "Sections", filterAria: "Filtrer par ville",
    mapFallback: "🗺️ La carte en direct a besoin d’internet — avec une eSIM/Wi-Fi elle marche ici même, sans appli. Pour un usage 100% hors ligne, importez le fichier my-trip.kml dans une appli de cartes (Organic Maps, Maps.me, OsmAnd…). Les autres onglets fonctionnent hors ligne.",
    wd: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
    mon: ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"],
    wf: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] },
  de: { cal: "Kalender", roteiro: "Reiseplan", trans: "Transport", places: "Orte", map: "Karte", stays: "Unterkunft",
    checkIn: "Check-in", checkOut: "Check-out", conf: "Buchung", price: "Preis", phone: "Telefon",
    mkPlace: "Orte", mkStay: "Unterkunft", mkStation: "Bahnhöfe/Flughäfen",
    showAll: "Alle zeigen", highlight: "Highlight", move: "Transfer", today: "Heute", mapApp: "Karten-App", transfers: "Transfers",
    filterHint: 'Tippe eine Stadt an, um nur sie zu sehen (gilt für alle 5 Tabs). "Alle zeigen" setzt zurück.',
    flights: "Flüge", moves: "Transfers der Reise", nights: "Nächte", base: "Basis", bases: "Basen",
    theme: "Dunkelmodus umschalten", langAria: "Sprache", tabsAria: "Bereiche", filterAria: "Nach Stadt filtern",
    mapFallback: "🗺️ Die Live-Karte braucht Internet — mit eSIM/WLAN funktioniert sie direkt hier, ohne App. Nur für 100% offline importiere die Datei my-trip.kml in eine Karten-App (Organic Maps, Maps.me, OsmAnd…). Die anderen Tabs funktionieren offline.",
    wd: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
    mon: ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"],
    wf: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"] },
  it: { cal: "Calendario", roteiro: "Itinerario", trans: "Trasporti", places: "Luoghi", map: "Mappa", stays: "Alloggio",
    checkIn: "Check-in", checkOut: "Check-out", conf: "Prenotazione", price: "Prezzo", phone: "Telefono",
    mkPlace: "luoghi", mkStay: "alloggio", mkStation: "stazioni/aeroporti",
    showAll: "Mostra tutto", highlight: "imperdibile", move: "spostamento", today: "Oggi", mapApp: "app di mappe", transfers: "Spostamenti",
    filterHint: 'Tocca una città per vedere solo quella (vale per le 5 schede). "Mostra tutto" azzera.',
    flights: "Voli", moves: "Spostamenti del viaggio", nights: "notti", base: "base", bases: "basi",
    theme: "Attiva modalità scura", langAria: "Lingua", tabsAria: "Sezioni", filterAria: "Filtra per città",
    mapFallback: "🗺️ La mappa dal vivo ha bisogno di internet — con eSIM/Wi-Fi funziona qui, senza app. Solo per l’uso 100% offline importa il file my-trip.kml in un’app di mappe (Organic Maps, Maps.me, OsmAnd…). Le altre schede funzionano offline.",
    wd: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
    mon: ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"],
    wf: ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"] },
};

export const LANG_LABEL = { en: "English", pt: "Português", es: "Español", fr: "Français", de: "Deutsch", it: "Italiano", zh: "中文", ja: "日本語" };

// textos do bloco "Google My Maps" da aba Mapa (fallback: en)
export const MAPTOOLS = {
  en: { dl: "Download points (.kml)", my: "Open Google My Maps", tip: "Download the .kml, then in My Maps: Create map → Import → upload the file → all points appear (no app)." },
  pt: { dl: "Baixar pontos (.kml)", my: "Abrir Google My Maps", tip: "Baixe o .kml e, no My Maps: Criar mapa → Importar → suba o arquivo → todos os pontos aparecem (sem app)." },
  es: { dl: "Descargar puntos (.kml)", my: "Abrir Google My Maps", tip: "Descarga el .kml y, en My Maps: Crear mapa → Importar → sube el archivo → aparecen todos los puntos (sin app)." },
  fr: { dl: "Télécharger les points (.kml)", my: "Ouvrir Google My Maps", tip: "Téléchargez le .kml puis, dans My Maps : Créer une carte → Importer → envoyer le fichier → tous les points apparaissent (sans appli)." },
  de: { dl: "Punkte laden (.kml)", my: "Google My Maps öffnen", tip: "Lade die .kml und in My Maps: Karte erstellen → Importieren → Datei hochladen → alle Punkte erscheinen (ohne App)." },
  it: { dl: "Scarica punti (.kml)", my: "Apri Google My Maps", tip: "Scarica il .kml e in My Maps: Crea mappa → Importa → carica il file → compaiono tutti i punti (senza app)." },
};

// Períodos do dia. A ordem aqui é a ordem de render — não reordene.
export const PERIODS = ["morning", "afternoon", "night"];

export const PERIOD_LABEL = {
  en: { morning: "Morning", afternoon: "Afternoon", night: "Night" },
  pt: { morning: "Manhã", afternoon: "Tarde", night: "Noite" },
  es: { morning: "Mañana", afternoon: "Tarde", night: "Noche" },
  fr: { morning: "Matin", afternoon: "Après-midi", night: "Soir" },
  de: { morning: "Morgen", afternoon: "Nachmittag", night: "Abend" },
  it: { morning: "Mattina", afternoon: "Pomeriggio", night: "Sera" },
};

export const PERIOD_ICON = { morning: "☀", afternoon: "◐", night: "☾" };

export const periodStr = (lang, key) => ((PERIOD_LABEL[lang] || PERIOD_LABEL.en)[key] ?? PERIOD_LABEL.en[key]);

export const uiStr = (lang, key) => ((UI[lang] || UI.en)[key] ?? UI.en[key]);
export const mapToolStr = (lang, key) => ((MAPTOOLS[lang] || MAPTOOLS.en)[key] ?? MAPTOOLS.en[key]);

// true quando o valor é um objeto bilíngue { en: "...", pt: "..." }
export const isBi = (v) => Boolean(v) && typeof v === "object" && !Array.isArray(v);

// pega o texto de um valor (string ou objeto bilíngue) num idioma
export const tx = (v, lang) => (isBi(v) ? (v[lang] ?? v.en ?? Object.values(v)[0] ?? "") : (v ?? ""));
