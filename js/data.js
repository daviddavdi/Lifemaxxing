/* ==========================================================================
   Lifemaxxing — Wienerisch: data for vocabulary, grammar and pronunciation
   ========================================================================== */

const CATEGORIES = [
  { id: "greetings",   label: "Greetings & Basics",        emoji: "👋" },
  { id: "numbers",     label: "Numbers",                    emoji: "🔢" },
  { id: "questions",   label: "Question Words",             emoji: "❓" },
  { id: "verbs",       label: "Core Verbs",                 emoji: "🏃" },
  { id: "adjectives",  label: "Adjectives",                 emoji: "✨" },
  { id: "time",        label: "Time & Days",                emoji: "🕒" },
  { id: "family",      label: "Family",                     emoji: "👪" },
  { id: "food",        label: "Food (Austrian words!)",     emoji: "🥟" },
  { id: "home",        label: "Home & Everyday Objects",    emoji: "🏠" },
  { id: "city",        label: "City & Transport (Wien)",    emoji: "🚋" },
  { id: "bureaucracy", label: "Amtsdeutsch (Bureaucracy)",  emoji: "📋" },
  { id: "slang",       label: "Wienerisch Slang",           emoji: "😎" },
];

/*
  Each vocab item:
  de        - the word/phrase you should actually say in Vienna
  de_std    - the "Germany-standard" equivalent, if it differs (else null)
  en        - English translation
  sr        - Serbian translation (helps you anchor meaning fast)
  note      - short teaching note (usage, gender, register)
  cat       - category id
*/
const VOCAB = [
  // ---------- Greetings & Basics ----------
  { de: "Grüß Gott", de_std: "Guten Tag", en: "hello (formal)", sr: "добар дан", cat: "greetings", note: "Standard formal greeting in Austria, even to strangers. Literally 'greet God'." },
  { de: "Servus", de_std: "Hallo / Tschüss", en: "hi / bye (informal)", sr: "здраво / ћао", cat: "greetings", note: "Works both ways — arriving or leaving. Extremely common, any age." },
  { de: "Baba", de_std: "Tschüss", en: "bye (very casual)", sr: "ћао", cat: "greetings", note: "Casual goodbye, often doubled: 'Baba baba!'" },
  { de: "Pfiat di", de_std: "Tschüss", en: "goodbye (dialect)", sr: "чувај се", cat: "greetings", note: "From 'behüte dich' (God protect you). 'Pfiat euch' for plural." },
  { de: "Habedere", de_std: "Guten Tag", en: "hello (old-fashioned polite)", sr: "поштовање", cat: "greetings", note: "From 'Habe die Ehre' (I have the honor). Charming, a bit old-fashioned/ironic now." },
  { de: "Bitte", de_std: null, en: "please / you're welcome / pardon?", sr: "молим", cat: "greetings", note: "Does triple duty — learn all three uses." },
  { de: "Danke", de_std: null, en: "thank you", sr: "хвала", cat: "greetings" },
  { de: "Danke schön", de_std: null, en: "thank you very much", sr: "хвала лепо", cat: "greetings" },
  { de: "Entschuldigung", de_std: null, en: "sorry / excuse me", sr: "извините", cat: "greetings" },
  { de: "Wie geht's dir?", de_std: null, en: "how are you? (informal)", sr: "како си?", cat: "greetings" },
  { de: "Wie geht es Ihnen?", de_std: null, en: "how are you? (formal)", sr: "како сте?", cat: "greetings" },
  { de: "Passt", de_std: "In Ordnung / Okay", en: "that's fine / works for me", sr: "важи", cat: "greetings", note: "All-purpose confirmation word — very Austrian." },
  { de: "Ja", de_std: null, en: "yes", sr: "да", cat: "greetings" },
  { de: "Na", de_std: "Nein", en: "no (colloquial)", sr: "не", cat: "greetings", note: "Careful: 'na' alone can also mean 'well...' — tone matters." },
  { de: "Nein", de_std: null, en: "no", sr: "не", cat: "greetings" },
  { de: "Ich heiße...", de_std: null, en: "my name is...", sr: "зовем се...", cat: "greetings" },
  { de: "Mein Name ist...", de_std: null, en: "my name is... (formal)", sr: "моје име је...", cat: "greetings" },
  { de: "Freut mich", de_std: null, en: "nice to meet you", sr: "драго ми је", cat: "greetings" },

  // ---------- Numbers ----------
  { de: "null", de_std: null, en: "zero", sr: "нула", cat: "numbers" },
  { de: "eins", de_std: null, en: "one", sr: "један", cat: "numbers" },
  { de: "zwei", de_std: null, en: "two", sr: "два", cat: "numbers" },
  { de: "drei", de_std: null, en: "three", sr: "три", cat: "numbers" },
  { de: "vier", de_std: null, en: "four", sr: "четири", cat: "numbers" },
  { de: "fünf", de_std: null, en: "five", sr: "пет", cat: "numbers" },
  { de: "sechs", de_std: null, en: "six", sr: "шест", cat: "numbers" },
  { de: "sieben", de_std: null, en: "seven", sr: "седам", cat: "numbers" },
  { de: "acht", de_std: null, en: "eight", sr: "осам", cat: "numbers" },
  { de: "neun", de_std: null, en: "nine", sr: "девет", cat: "numbers" },
  { de: "zehn", de_std: null, en: "ten", sr: "десет", cat: "numbers" },
  { de: "elf", de_std: null, en: "eleven", sr: "једанаест", cat: "numbers" },
  { de: "zwölf", de_std: null, en: "twelve", sr: "дванаест", cat: "numbers" },
  { de: "zwanzig", de_std: null, en: "twenty", sr: "двадесет", cat: "numbers" },
  { de: "dreißig", de_std: null, en: "thirty", sr: "тридесет", cat: "numbers" },
  { de: "vierzig", de_std: null, en: "forty", sr: "четрдесет", cat: "numbers" },
  { de: "fünfzig", de_std: null, en: "fifty", sr: "педесет", cat: "numbers" },
  { de: "hundert", de_std: null, en: "hundred", sr: "сто", cat: "numbers" },
  { de: "tausend", de_std: null, en: "thousand", sr: "хиљаду", cat: "numbers" },
  { de: "eineinhalb", de_std: null, en: "one and a half", sr: "један и по", cat: "numbers" },

  // ---------- Question words ----------
  { de: "wer", de_std: null, en: "who", sr: "ко", cat: "questions" },
  { de: "was", de_std: null, en: "what", sr: "шта", cat: "questions" },
  { de: "wo", de_std: null, en: "where", sr: "где", cat: "questions" },
  { de: "wohin", de_std: null, en: "where to", sr: "куда", cat: "questions" },
  { de: "wann", de_std: null, en: "when", sr: "када", cat: "questions" },
  { de: "warum", de_std: null, en: "why", sr: "зашто", cat: "questions" },
  { de: "wie", de_std: null, en: "how", sr: "како", cat: "questions" },
  { de: "wie viel", de_std: null, en: "how much", sr: "колико", cat: "questions" },
  { de: "wie viele", de_std: null, en: "how many", sr: "колико (бројиво)", cat: "questions" },
  { de: "welche/-r/-s", de_std: null, en: "which", sr: "који/која/које", cat: "questions" },
  { de: "wessen", de_std: null, en: "whose", sr: "чији", cat: "questions" },

  // ---------- Core verbs ----------
  { de: "sein", de_std: null, en: "to be", sr: "бити", cat: "verbs", note: "ich bin, du bist, er/sie ist, wir sind, ihr seid, sie sind" },
  { de: "haben", de_std: null, en: "to have", sr: "имати", cat: "verbs", note: "ich habe, du hast, er/sie hat, wir haben" },
  { de: "gehen", de_std: null, en: "to go (on foot)", sr: "ићи", cat: "verbs" },
  { de: "kommen", de_std: null, en: "to come", sr: "доћи", cat: "verbs" },
  { de: "machen", de_std: null, en: "to do / make", sr: "радити / правити", cat: "verbs" },
  { de: "sehen", de_std: null, en: "to see", sr: "видети", cat: "verbs" },
  { de: "sagen", de_std: null, en: "to say", sr: "рећи", cat: "verbs" },
  { de: "wissen", de_std: null, en: "to know (a fact)", sr: "знати", cat: "verbs" },
  { de: "kennen", de_std: null, en: "to know (a person/place)", sr: "познавати", cat: "verbs" },
  { de: "können", de_std: null, en: "can / to be able to", sr: "моћи", cat: "verbs", note: "modal verb" },
  { de: "müssen", de_std: null, en: "must / to have to", sr: "морати", cat: "verbs", note: "modal verb" },
  { de: "wollen", de_std: null, en: "to want", sr: "хтети", cat: "verbs", note: "modal verb" },
  { de: "mögen", de_std: null, en: "to like", sr: "свиђати се", cat: "verbs", note: "modal verb; 'ich möchte' = I would like" },
  { de: "brauchen", de_std: null, en: "to need", sr: "требати", cat: "verbs" },
  { de: "arbeiten", de_std: null, en: "to work", sr: "радити", cat: "verbs" },
  { de: "wohnen", de_std: null, en: "to live (reside)", sr: "становати", cat: "verbs" },
  { de: "essen", de_std: null, en: "to eat", sr: "јести", cat: "verbs" },
  { de: "trinken", de_std: null, en: "to drink", sr: "пити", cat: "verbs" },
  { de: "schlafen", de_std: null, en: "to sleep", sr: "спавати", cat: "verbs" },
  { de: "kaufen", de_std: null, en: "to buy", sr: "куповати", cat: "verbs" },
  { de: "geben", de_std: null, en: "to give", sr: "дати", cat: "verbs" },
  { de: "nehmen", de_std: null, en: "to take", sr: "узети", cat: "verbs" },
  { de: "finden", de_std: null, en: "to find", sr: "наћи", cat: "verbs" },
  { de: "lernen", de_std: null, en: "to learn", sr: "учити", cat: "verbs" },
  { de: "verstehen", de_std: null, en: "to understand", sr: "разумети", cat: "verbs" },
  { de: "sprechen", de_std: null, en: "to speak", sr: "говорити", cat: "verbs" },
  { de: "schauen", de_std: "gucken", en: "to look", sr: "гледати", cat: "verbs", note: "Austrians/southern Germans say 'schauen', not 'gucken'." },

  // ---------- Adjectives ----------
  { de: "groß", de_std: null, en: "big", sr: "велики", cat: "adjectives" },
  { de: "klein", de_std: null, en: "small", sr: "мали", cat: "adjectives" },
  { de: "gut", de_std: null, en: "good", sr: "добар", cat: "adjectives" },
  { de: "schlecht", de_std: null, en: "bad", sr: "лош", cat: "adjectives" },
  { de: "leiwand", de_std: "super / cool", en: "awesome / great", sr: "супер", cat: "adjectives", note: "Classic Viennese slang for 'cool/great'." },
  { de: "schön", de_std: null, en: "beautiful", sr: "леп", cat: "adjectives" },
  { de: "hässlich", de_std: null, en: "ugly", sr: "ружан", cat: "adjectives" },
  { de: "schnell", de_std: null, en: "fast", sr: "брз", cat: "adjectives" },
  { de: "langsam", de_std: null, en: "slow", sr: "спор", cat: "adjectives" },
  { de: "warm", de_std: null, en: "warm", sr: "топао", cat: "adjectives" },
  { de: "kalt", de_std: null, en: "cold", sr: "хладан", cat: "adjectives" },
  { de: "neu", de_std: null, en: "new", sr: "нов", cat: "adjectives" },
  { de: "alt", de_std: null, en: "old", sr: "стар", cat: "adjectives" },
  { de: "teuer", de_std: null, en: "expensive", sr: "скуп", cat: "adjectives" },
  { de: "billig", de_std: null, en: "cheap", sr: "јефтин", cat: "adjectives" },
  { de: "gscheit", de_std: "klug / ziemlich", en: "smart / (as intensifier) really", sr: "паметан / прилично", cat: "adjectives", note: "'des is a gscheite Idee' = that's a smart idea. Also used like 'quite/really'." },
  { de: "deppert", de_std: "dumm", en: "stupid / silly", sr: "глуп", cat: "adjectives", note: "Mild, very common insult/tease. Not too harsh among friends." },
  { de: "müde", de_std: null, en: "tired", sr: "уморан", cat: "adjectives" },
  { de: "hungrig", de_std: null, en: "hungry", sr: "гладан", cat: "adjectives" },
  { de: "durstig", de_std: null, en: "thirsty", sr: "жедан", cat: "adjectives" },

  // ---------- Time & days ----------
  { de: "Montag", de_std: null, en: "Monday", sr: "понедељак", cat: "time" },
  { de: "Dienstag", de_std: null, en: "Tuesday", sr: "уторак", cat: "time" },
  { de: "Mittwoch", de_std: null, en: "Wednesday", sr: "среда", cat: "time" },
  { de: "Donnerstag", de_std: null, en: "Thursday", sr: "четвртак", cat: "time" },
  { de: "Freitag", de_std: null, en: "Friday", sr: "петак", cat: "time" },
  { de: "Samstag", de_std: "Sonnabend", en: "Saturday", sr: "субота", cat: "time", note: "Austrians (like most of Germany) say 'Samstag', not 'Sonnabend'." },
  { de: "Sonntag", de_std: null, en: "Sunday", sr: "недеља", cat: "time" },
  { de: "heute", de_std: null, en: "today", sr: "данас", cat: "time" },
  { de: "morgen", de_std: null, en: "tomorrow", sr: "сутра", cat: "time" },
  { de: "gestern", de_std: null, en: "yesterday", sr: "јуче", cat: "time" },
  { de: "Jänner", de_std: "Januar", en: "January", sr: "јануар", cat: "time", note: "Austrian form. Also 'Feber' for Februar exists but Februar is more common." },
  { de: "die Woche", de_std: null, en: "the week", sr: "недеља (седмица)", cat: "time" },
  { de: "der Monat", de_std: null, en: "the month", sr: "месец", cat: "time" },
  { de: "das Jahr", de_std: null, en: "the year", sr: "година", cat: "time" },
  { de: "die Uhr", de_std: null, en: "the clock / o'clock", sr: "сат", cat: "time" },
  { de: "jetzt", de_std: null, en: "now", sr: "сада", cat: "time" },
  { de: "später", de_std: null, en: "later", sr: "касније", cat: "time" },
  { de: "gleich", de_std: null, en: "right away / soon", sr: "одмах", cat: "time" },

  // ---------- Family ----------
  { de: "die Mutter", de_std: null, en: "mother", sr: "мајка", cat: "family" },
  { de: "der Vater", de_std: null, en: "father", sr: "отац", cat: "family" },
  { de: "die Oma", de_std: null, en: "grandma", sr: "бака", cat: "family" },
  { de: "der Opa", de_std: null, en: "grandpa", sr: "деда", cat: "family" },
  { de: "der Bruder", de_std: null, en: "brother", sr: "брат", cat: "family" },
  { de: "die Schwester", de_std: null, en: "sister", sr: "сестра", cat: "family" },
  { de: "der Onkel", de_std: null, en: "uncle", sr: "стриц/ујак/теча", cat: "family" },
  { de: "die Tante", de_std: null, en: "aunt", sr: "тетка/стрина/ујна", cat: "family" },
  { de: "das Kind", de_std: null, en: "child", sr: "дете", cat: "family" },
  { de: "der Sohn", de_std: null, en: "son", sr: "син", cat: "family" },
  { de: "die Tochter", de_std: null, en: "daughter", sr: "ћерка", cat: "family" },
  { de: "der Freund / die Freundin", de_std: null, en: "friend / boyfriend/girlfriend", sr: "пријатељ / девојка", cat: "family", note: "Context decides 'friend' vs 'partner' — big false-friend trap." },

  // ---------- Food: the classic Austrianisms ----------
  { de: "der Paradeiser", de_std: "die Tomate", en: "tomato", sr: "парадајз", cat: "food", note: "Literally 'the one from Paradise'. THE flagship Austrian word." },
  { de: "der Erdapfel", de_std: "die Kartoffel", en: "potato", sr: "кромпир", cat: "food", note: "Plural: die Erdäpfel. Literally 'earth-apple' — same logic as Serbian doesn't quite map, but same idea as French 'pomme de terre'." },
  { de: "die Marille", de_std: "die Aprikose", en: "apricot", sr: "кајсија", cat: "food" },
  { de: "der Karfiol", de_std: "der Blumenkohl", en: "cauliflower", sr: "карфиол", cat: "food", note: "Serbian 'карфиол' is a direct loan from this Austrian word!" },
  { de: "die Fisolen", de_std: "die grünen Bohnen", en: "green beans", sr: "боранија", cat: "food", note: "Always plural." },
  { de: "der Kren", de_std: "der Meerrettich", en: "horseradish", sr: "рен", cat: "food" },
  { de: "der Powidl", de_std: "das Pflaumenmus", en: "plum jam", sr: "пекмез од шљива", cat: "food" },
  { de: "die Palatschinke", de_std: "der Pfannkuchen", en: "crêpe / thin pancake", sr: "палачинка", cat: "food", note: "Near-identical to Serbian 'палачинка' — same Central European origin." },
  { de: "das Faschierte", de_std: "das Hackfleisch", en: "minced/ground meat", sr: "млевено месо", cat: "food" },
  { de: "der Schlagobers", de_std: "die Schlagsahne", en: "whipped cream", sr: "шлаг", cat: "food" },
  { de: "der Topfen", de_std: "der Quark", en: "quark (curd cheese)", sr: "кварк / урда", cat: "food" },
  { de: "die Semmel", de_std: "das Brötchen", en: "bread roll", sr: "земичка", cat: "food" },
  { de: "die Golatsche", de_std: "die Kolatsche", en: "sweet filled pastry", sr: "коláч (сродно)", cat: "food" },
  { de: "das Kipferl", de_std: null, en: "small crescent-shaped pastry", sr: "кифла", cat: "food", note: "Ancestor of the French croissant!" },
  { de: "der Sacherwürfel / die Jause", de_std: "der Snack / das Vesper", en: "light meal / snack", sr: "ужина", cat: "food", note: "'Jause' is the everyday Austrian word for a light snack/meal." },
  { de: "das Beisl", de_std: "die Kneipe", en: "small pub / tavern", sr: "кафана", cat: "food", note: "Cozy traditional Viennese pub serving simple food." },
  { de: "der Sturm", de_std: null, en: "partially fermented young wine", sr: "бурчак", cat: "food", note: "Seasonal autumn drink, very Viennese/Austrian tradition." },
  { de: "der Melange", de_std: null, en: "Viennese coffee with milk (like a milky cappuccino)", sr: "бела кафа", cat: "food", note: "Order this in a Kaffeehaus." },
  { de: "ein Glas Wasser", de_std: null, en: "a glass of water", sr: "чаша воде", cat: "food" },

  // ---------- Home & everyday objects ----------
  { de: "das Sackerl", de_std: "die Tüte", en: "small bag", sr: "кеса", cat: "home", note: "The -erl diminutive is peak Viennese charm. Ask 'Brauchen Sie ein Sackerl?' at a shop." },
  { de: "der Polster", de_std: "das Kissen", en: "pillow / cushion", sr: "јастук", cat: "home" },
  { de: "der Fauteuil", de_std: "der Sessel", en: "armchair", sr: "фотеља", cat: "home", note: "French loanword, pronounced roughly 'fo-TÖY'. Note the Sessel swap below!" },
  { de: "der Sessel", de_std: "der Stuhl", en: "chair", sr: "столица", cat: "home", note: "Tricky: in Germany 'Sessel' = armchair, but in Austria 'Sessel' = ordinary chair." },
  { de: "der Kasten", de_std: "der Schrank", en: "wardrobe / cupboard", sr: "орман", cat: "home" },
  { de: "die Stiege", de_std: "die Treppe", en: "staircase", sr: "степениште", cat: "home" },
  { de: "das Häferl", de_std: "die Tasse", en: "mug / cup", sr: "шоља", cat: "home", note: "Another lovable -erl diminutive." },
  { de: "das Packerl", de_std: "das Päckchen", en: "small package/parcel", sr: "пакетић", cat: "home" },
  { de: "der Rauchfang", de_std: "der Schornstein", en: "chimney", sr: "димњак", cat: "home" },
  { de: "das Sofa", de_std: null, en: "sofa", sr: "софа", cat: "home" },

  // ---------- City & transport (Vienna specific) ----------
  { de: "die Bim", de_std: "die Straßenbahn", en: "tram", sr: "трамвај", cat: "city", note: "Beloved Viennese nickname for the tram." },
  { de: "die Öffis", de_std: "die öffentlichen Verkehrsmittel", en: "public transport", sr: "јавни превоз", cat: "city" },
  { de: "der Greißler", de_std: "der Tante-Emma-Laden", en: "small corner grocery shop", sr: "локална продавница", cat: "city" },
  { de: "der Bezirk", de_std: null, en: "district", sr: "округ / реон", cat: "city", note: "Vienna has 23 numbered Bezirke — locals identify by number, e.g. 'im siebten Bezirk'." },
  { de: "der Gemeindebau", de_std: null, en: "public/council housing block", sr: "социјални стан (зграда)", cat: "city", note: "Iconic Viennese institution of municipal housing." },
  { de: "der Bankomat", de_std: "der Geldautomat", en: "ATM", sr: "банкомат", cat: "city" },
  { de: "das Handy", de_std: null, en: "mobile phone", sr: "мобилни телефон", cat: "city", note: "Used across German-speaking world, not just Austria." },
  { de: "der Gehsteig", de_std: "der Bürgersteig / Gehweg", en: "sidewalk", sr: "тротоар", cat: "city" },
  { de: "die Auslage", de_std: "das Schaufenster", en: "shop window", sr: "излог", cat: "city" },
  { de: "der Fußgängerübergang", de_std: null, en: "pedestrian crossing", sr: "пешачки прелаз", cat: "city" },

  // ---------- Amtsdeutsch / bureaucracy (Austria loves this) ----------
  { de: "der Meldezettel", de_std: null, en: "residence registration form", sr: "пријава пребивалишта", cat: "bureaucracy", note: "You'll need this within days of moving to Austria — required by law." },
  { de: "das Ansuchen", de_std: "der Antrag", en: "formal application/request", sr: "молба / захтев", cat: "bureaucracy" },
  { de: "der Bescheid", de_std: null, en: "official notice / ruling", sr: "решење / обавештење", cat: "bureaucracy", note: "'Ich gib dir Bescheid' (casual) = I'll let you know." },
  { de: "die Matura", de_std: "das Abitur", en: "school-leaving exam", sr: "матура", cat: "bureaucracy", note: "Same word as Serbian 'матура' — an easy win!" },
  { de: "das Zeugnis", de_std: null, en: "school report / certificate", sr: "сведочанство", cat: "bureaucracy" },
  { de: "die Anmeldung", de_std: null, en: "registration", sr: "пријава", cat: "bureaucracy" },
  { de: "der Erlagschein", de_std: "der Überweisungsschein", en: "payment slip", sr: "уплатница", cat: "bureaucracy" },
  { de: "die Gemeinde", de_std: null, en: "municipality", sr: "општина", cat: "bureaucracy" },
  { de: "der/die Beamte/-r", de_std: null, en: "civil servant / official", sr: "службеник", cat: "bureaucracy" },
  { de: "die Frist", de_std: null, en: "deadline", sr: "рок", cat: "bureaucracy" },

  // ---------- Wienerisch slang ----------
  { de: "Oida", de_std: null, en: "dude / man / wow (filler)", sr: "бре / чoвече", cat: "slang", note: "THE most iconic Viennese word. Can express almost any emotion by tone alone." },
  { de: "eh", de_std: "sowieso", en: "anyway / already / of course", sr: "тако и тако", cat: "slang", note: "Tiny filler word used constantly: 'Des is eh klar' = that's obvious anyway." },
  { de: "eh klar", de_std: null, en: "obviously / of course", sr: "наравно", cat: "slang" },
  { de: "der Hawara", de_std: "der Kumpel", en: "buddy / mate", sr: "друг / другар", cat: "slang", note: "Has Yiddish/Hungarian roots — a nod to old Vienna's melting-pot history." },
  { de: "der Haberer", de_std: "der Kumpel", en: "buddy / boyfriend (slang)", sr: "цимер / момак", cat: "slang" },
  { de: "der Schmäh", de_std: null, en: "charming wit / banter / a 'line'", sr: "духовитост / фазон", cat: "slang", note: "Core concept of Viennese humor — dry, ironic, self-deprecating charisma. 'Wiener Schmäh' is famous." },
  { de: "picken", de_std: "kleben", en: "to stick/glue", sr: "лепити се", cat: "slang" },
  { de: "der Wappler", de_std: null, en: "idiot / clumsy person (mild insult)", sr: "будала", cat: "slang" },
  { de: "urst", de_std: "sehr / total", en: "really / extremely", sr: "стварно / изузетно", cat: "slang", note: "Intensifier, especially among younger speakers: 'urst leiwand!'" },
  { de: "bissl", de_std: "bisschen", en: "a little", sr: "мало", cat: "slang" },
  { de: "nix", de_std: "nichts", en: "nothing", sr: "ништа", cat: "slang" },
];

/* ==========================================================================
   Grammar reference content (rendered as HTML)
   ========================================================================== */
const GRAMMAR_SECTIONS = [
  {
    title: "1. Why Serbian is your secret weapon",
    html: `
      <p>German grammar scares English speakers because English lost its case system centuries ago.
      You didn't. Serbian has <strong>seven</strong> cases; German only has <strong>four</strong>, and three of
      them (Nominativ, Genitiv, Dativ) are literally the same names you already learned in school
      for падеж. Akuzativ = Акузатив. You are not learning a new concept — you're learning where four
      familiar concepts land on four fewer forks than Serbian gives you.</p>
      <table class="gtable">
        <tr><th>German case</th><th>Serbian case</th><th>Answers</th><th>Example role</th></tr>
        <tr><td>Nominativ</td><td>Номинатив</td><td>who/what (subject)</td><td><em>Der Mann</em> geht.</td></tr>
        <tr><td>Akkusativ</td><td>Акузатив</td><td>whom/what (direct object)</td><td>Ich sehe <em>den Mann</em>.</td></tr>
        <tr><td>Dativ</td><td>Датив</td><td>to/for whom (indirect object)</td><td>Ich gebe <em>dem Mann</em> das Buch.</td></tr>
        <tr><td>Genitiv</td><td>Генитив</td><td>whose (possession)</td><td>das Auto <em>des Mannes</em></td></tr>
      </table>
      <p>The catch German adds that Serbian doesn't have in the same way: <strong>grammatical gender is
      not predictable from meaning</strong> — der Tisch (table, masc.), die Lampe (lamp, fem.), das Kind
      (child, neut.). Learn every noun WITH its article from day one. Never learn "Tisch" — learn
      "der Tisch".</p>`
  },
  {
    title: "2. Articles across all four cases",
    html: `
      <table class="gtable">
        <tr><th></th><th>masc. (der)</th><th>fem. (die)</th><th>neut. (das)</th><th>plural (die)</th></tr>
        <tr><td>Nom.</td><td>der</td><td>die</td><td>das</td><td>die</td></tr>
        <tr><td>Akk.</td><td>den</td><td>die</td><td>das</td><td>die</td></tr>
        <tr><td>Dat.</td><td>dem</td><td>der</td><td>dem</td><td>den (+n)</td></tr>
        <tr><td>Gen.</td><td>des (+s/es)</td><td>der</td><td>des (+s/es)</td><td>der</td></tr>
      </table>
      <p>Only the <strong>masculine</strong> column really changes in the Akkusativ (der → den) — this is
      the single highest-value grammar fact for a beginner. Everything else in Akkusativ looks like
      Nominativ. Master that one shift first.</p>`
  },
  {
    title: "3. Present tense — regular and key irregular verbs",
    html: `
      <table class="gtable">
        <tr><th>Pronoun</th><th>machen</th><th>sein</th><th>haben</th></tr>
        <tr><td>ich</td><td>mache</td><td>bin</td><td>habe</td></tr>
        <tr><td>du</td><td>machst</td><td>bist</td><td>hast</td></tr>
        <tr><td>er/sie/es</td><td>macht</td><td>ist</td><td>hat</td></tr>
        <tr><td>wir</td><td>machen</td><td>sind</td><td>haben</td></tr>
        <tr><td>ihr</td><td>macht</td><td>seid</td><td>habt</td></tr>
        <tr><td>sie/Sie</td><td>machen</td><td>sind</td><td>haben</td></tr>
      </table>
      <p>Regular verbs all follow the -e/-st/-t/-en/-t/-en pattern of "machen". Learn <em>sein</em> and
      <em>haben</em> by heart in week one — everything else (Perfekt tense, passive voice) depends on them.</p>`
  },
  {
    title: "4. Word order: the V2 rule",
    html: `
      <p>In a main clause, the conjugated verb is always the <strong>second element</strong> — not
      necessarily the second word. Anything can occupy position 1 (subject, time, place, object), but
      the verb stays glued to position 2.</p>
      <ul>
        <li><em>Ich</em> <strong>trinke</strong> heute einen Kaffee.</li>
        <li><em>Heute</em> <strong>trinke</strong> ich einen Kaffee.</li>
        <li><em>Einen Kaffee</em> <strong>trinke</strong> ich heute.</li>
      </ul>
      <p>In a subordinate clause (after weil, dass, wenn, ob…), the conjugated verb jumps to the
      <strong>very end</strong>: "Ich bleibe zu Hause, weil ich müde <strong>bin</strong>."</p>`
  },
  {
    title: "5. Talking about the past: use Perfekt, not Präteritum",
    html: `
      <p>This is the single biggest practical difference from textbook German: in Austria (and southern
      Germany), the <strong>Perfekt</strong> tense is used for spoken past almost exclusively, even for
      "I went" or "I ate yesterday". The Präteritum ("ich ging") sounds like a written novel, not
      conversation. Build the Perfekt with <em>haben</em> or <em>sein</em> + past participle:</p>
      <ul>
        <li>Ich <strong>habe</strong> einen Kaffee <strong>getrunken</strong>. (I drank a coffee.)</li>
        <li>Ich <strong>bin</strong> nach Wien <strong>gefahren</strong>. (I traveled to Vienna.) — motion verbs take <em>sein</em>.</li>
        <li>Ich <strong>habe</strong> das Buch <strong>gelesen</strong>. (I read the book.)</li>
      </ul>
      <p>Rule of thumb: verbs of motion or change of state (gehen, fahren, kommen, aufstehen, werden) use
      <em>sein</em>; almost everything else uses <em>haben</em>.</p>`
  },
  {
    title: "6. Modal verbs — the fastest way to sound fluent",
    html: `
      <table class="gtable">
        <tr><th></th><th>können (can)</th><th>müssen (must)</th><th>wollen (want)</th><th>möchten (would like)</th></tr>
        <tr><td>ich</td><td>kann</td><td>muss</td><td>will</td><td>möchte</td></tr>
        <tr><td>du</td><td>kannst</td><td>musst</td><td>willst</td><td>möchtest</td></tr>
        <tr><td>er/sie</td><td>kann</td><td>muss</td><td>will</td><td>möchte</td></tr>
        <tr><td>wir</td><td>können</td><td>müssen</td><td>wollen</td><td>möchten</td></tr>
      </table>
      <p>Modal + infinitive-at-the-end is an instant fluency booster: "Ich <strong>möchte</strong> einen
      Kaffee <strong>trinken</strong>." Native speakers use this constantly — prioritize it over
      memorizing more tenses.</p>`
  },
  {
    title: "7. Formality: du vs. Sie",
    html: `
      <p>Austrians are traditionally a notch more formal than Germans in shops, offices and with anyone
      older or in a service role — default to <strong>Sie</strong> with strangers and switch to
      <strong>du</strong> only when invited ("Wollen wir uns duzen?"), which happens fast among younger
      people and in casual/service settings (cafés, bars) but stays formal in offices, with landlords,
      doctors, and officials.</p>`
  },
];

const PRONUNCIATION_SECTIONS = [
  {
    title: "Standard German sounds worth drilling first",
    html: `
      <table class="gtable">
        <tr><th>Letter(s)</th><th>Sounds like</th><th>Example</th></tr>
        <tr><td>ch (after a,o,u)</td><td>raspy back-of-throat (like Serbian "х" but harsher)</td><td>Bach, Buch</td></tr>
        <tr><td>ch (after e,i)</td><td>soft "hy" hiss, tongue high and forward</td><td>ich, nicht</td></tr>
        <tr><td>ei</td><td>"ai" as in "eye"</td><td>mein, Wien... wait, "ei" not "ie"</td></tr>
        <tr><td>ie</td><td>long "ee"</td><td>Wien, Liebe</td></tr>
        <tr><td>eu / äu</td><td>"oy"</td><td>neu, Häuser</td></tr>
        <tr><td>z</td><td>"ts"</td><td>Zeit → "tsyte"</td></tr>
        <tr><td>s + vowel</td><td>"z" (voiced)</td><td>sehen → "zey-en"</td></tr>
        <tr><td>ö</td><td>like French "eu" / Serbian doesn't have it — round lips, say "e"</td><td>schön</td></tr>
        <tr><td>ü</td><td>round lips, say "i" — like Serbian "и" with pursed lips</td><td>müde</td></tr>
        <tr><td>r</td><td>often a soft, almost swallowed back-of-throat sound in Austria (not a rolled Serbian "р")</td><td>Bruder</td></tr>
      </table>`
  },
  {
    title: "Viennese German (Wienerisch) shifts — what actually makes you sound local",
    html: `
      <p>Standard Austrian German (Österreichisches Standarddeutsch, used in news/school/office) is close
      to what's above. The Viennese <em>dialect</em> layered on top is what makes locals sound distinctly
      "Viennese" — recognize it even if you don't fully imitate it at first:</p>
      <ul>
        <li><strong>L-vocalization:</strong> a word-final or pre-consonant "l" softens toward a vowel —
        "Ball" leans toward "Boi", "Fußball" toward "Fuaßboi".</li>
        <li><strong>ei → oa:</strong> "kein" → "koa", "heim" → "ham" / "hoam", "ein" → "oa".</li>
        <li><strong>ich → i:</strong> "ich weiß nicht" often becomes "i woas ned".</li>
        <li><strong>The -erl diminutive:</strong> attaches to almost anything to sound cozy/affectionate —
        Sackerl, Häferl, Packerl, Kaffeerl. Overusing it is part of the charm, not a mistake.</li>
        <li><strong>Broad, nasal vowels</strong> and a generally more "sing-song", rising-falling melody
        than the flatter intonation of standard German from Germany.</li>
        <li><strong>Filler word "eh":</strong> dropped into sentences constantly, roughly "anyway/already".</li>
      </ul>
      <p><strong>Practical advice:</strong> learn to <em>understand</em> the dialect early (it's everywhere
      in daily life), but <em>speak</em> standard Austrian German (Österreichisches Standarddeutsch) with
      Austrian vocabulary (Paradeiser, Erdapfel, Sackerl, etc.) until you're advanced — that combination
      already reads as unmistakably Austrian and is universally understood and well-regarded, while a
      non-native speaking full dialect can come across as trying too hard.</p>`
  },
];

const ROADMAP = [
  {
    phase: "Phase 0 — Foundations (Week 1)",
    goal: "Sounds, the alphabet, and your first 50 words.",
    items: [
      "Drill the pronunciation guide out loud daily (use the TTS buttons in Vocabulary).",
      "Memorize greetings & basics deck to 100%.",
      "Learn numbers 0–100.",
      "Read the grammar sections on gender & cases once — don't aim to master yet, just recognize.",
    ],
  },
  {
    phase: "Phase 1 — Grammar engine (Weeks 2–3)",
    goal: "Build the sentence machine: cases, present tense, word order.",
    items: [
      "Master der/die/das + all 4 cases using the Serbian-comparison table.",
      "Drill sein/haben/modal verbs until they're automatic.",
      "Practice V2 word order by rearranging 10 sentences a day (put time/object first).",
      "Study core verbs deck.",
    ],
  },
  {
    phase: "Phase 2 — Real vocabulary, Austrian first (Weeks 3–5)",
    goal: "500+ everyday words, always with the Austrian variant.",
    items: [
      "Clear the food, home, and city decks — these carry the highest density of Austrianisms.",
      "Start speaking only in Perfekt for past-tense stories about your day.",
      "Shadow one short Austrian news clip or podcast per day, even if you understand 30%.",
    ],
  },
  {
    phase: "Phase 3 — Sound like Vienna (Weeks 5–8)",
    goal: "Recognize and start layering in dialect + slang.",
    items: [
      "Clear the Wienerisch Slang deck; know Oida, eh, Schmäh, leiwand cold.",
      "Practice recognizing ei→oa and l-vocalization by ear (Viennese TV/radio, e.g. ORF).",
      "Learn Amtsdeutsch basics — you'll need Meldezettel, Ansuchen etc. for real life in Austria.",
      "Start a daily 10-minute journal entry in German about your day (Perfekt tense).",
    ],
  },
  {
    phase: "Phase 4 — Conversational fluency (Weeks 8–12)",
    goal: "Hold real unscripted conversations; formal register (Sie) solid.",
    items: [
      "Find a language exchange partner or tutor for 2–3x/week speaking practice.",
      "Do full quiz cycles daily until due-cards in Flashcards stays near zero.",
      "Practice Sie-form small talk for shops, offices, doctors.",
      "Watch Austrian shows/films without subtitles for 20+ min/day.",
    ],
  },
  {
    phase: "Phase 5 — Toward native-like (ongoing, months 4+)",
    goal: "The honest truth: sounding fully indistinguishable from a native takes years of immersion — but by month 3–4 with this plan you'll pass as a confident, well-integrated Viennese speaker.",
    items: [
      "Live as much of your life in German as possible: switch phone, socials, thoughts.",
      "Read a Kronen Zeitung or Standard article daily; join local clubs/Vereine.",
      "Keep refining dialect features — the -erl, the Schmäh, the melody — through real contact with Viennese speakers.",
      "Revisit grammar edge cases (Genitiv in writing, subjunctive/Konjunktiv II) once speaking is fluent.",
    ],
  },
];
