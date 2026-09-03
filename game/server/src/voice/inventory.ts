export const VOICE_LOCALES = ["en", "hi", "ta", "kn", "te"] as const;
export type VoiceLocale = (typeof VOICE_LOCALES)[number];

export const VOICE_ROLES = [
  "narrator",
  "vrishaketu",
  "kunti",
  "chitra",
  "raider-one",
  "raider-two",
] as const;
export type VoiceRole = (typeof VOICE_ROLES)[number];

export type VoiceLine = {
  id: string;
  scope: "chapter-0" | "chapter-1";
  sequence: number;
  role: VoiceRole;
  text: Record<VoiceLocale, string>;
};

export const LOCALE_METADATA: Record<
  VoiceLocale,
  { label: string; bcp47: string; macOSVoice: string }
> = {
  en: { label: "English", bcp47: "en-IN", macOSVoice: "Aman" },
  hi: { label: "Hindi", bcp47: "hi-IN", macOSVoice: "Lekha" },
  ta: { label: "Tamil", bcp47: "ta-IN", macOSVoice: "Vani" },
  kn: { label: "Kannada", bcp47: "kn-IN", macOSVoice: "Soumya" },
  te: { label: "Telugu", bcp47: "te-IN", macOSVoice: "Geeta" },
};

export const ROLE_METADATA: Record<
  VoiceRole,
  {
    label: string;
    personaId: string;
    description: string;
    providerVoice: string;
    fallbackRate: number;
  }
> = {
  narrator: {
    label: "Narrator",
    personaId: "dwarka.narrator.v2",
    description: "Restrained adult narrator",
    providerVoice: "aditya",
    fallbackRate: 158,
  },
  vrishaketu: {
    label: "Vrishaketu",
    personaId: "dwarka.vrishaketu.v1",
    description: "Young adult male Vrishaketu",
    providerVoice: "aditya",
    fallbackRate: 176,
  },
  kunti: {
    label: "Kunti",
    personaId: "dwarka.kunti.v2",
    description: "Adult female Kunti",
    providerVoice: "ishita",
    fallbackRate: 146,
  },
  chitra: {
    label: "Chitra",
    personaId: "dwarka.chitra.v2",
    description: "Young, clear Chitra delivery",
    providerVoice: "ishita",
    fallbackRate: 178,
  },
  "raider-one": {
    label: "Raider one",
    personaId: "dwarka.raider-one.v1",
    description: "First adult male raider",
    providerVoice: "amit",
    fallbackRate: 182,
  },
  "raider-two": {
    label: "Raider two",
    personaId: "dwarka.raider-two.v1",
    description: "Second adult male raider",
    providerVoice: "rohan",
    fallbackRate: 138,
  },
};

export const FIXED_VOICE_LINES: VoiceLine[] = [
  {
    id: "ch0-panel-01-battlefield",
    scope: "chapter-0",
    sequence: 1,
    role: "narrator",
    text: {
      en: "Karna stood for his last day beneath a sun dimmed by dust. Around him, the field had forgotten the difference between victory and grief.",
      hi: "कर्ण धूल से धुँधले हुए सूर्य के नीचे अपने अंतिम दिन के लिए खड़े थे। उनके चारों ओर रणभूमि विजय और शोक का अंतर भूल चुकी थी।",
      ta: "தூசியால் மங்கிய சூரியனின் கீழ் கர்ணன் தனது இறுதி நாளை எதிர்கொண்டு நின்றான். அவனைச் சுற்றிய போர்க்களம் வெற்றிக்கும் துயரத்துக்கும் உள்ள வேறுபாட்டை மறந்திருந்தது.",
      kn: "ಧೂಳಿನಿಂದ ಮಂಕಾದ ಸೂರ್ಯನ ಕೆಳಗೆ ಕರ್ಣನು ತನ್ನ ಕೊನೆಯ ದಿನವನ್ನು ಎದುರಿಸಿ ನಿಂತನು. ಅವನ ಸುತ್ತಲಿನ ರಣಭೂಮಿ ಜಯ ಮತ್ತು ದುಃಖದ ನಡುವಿನ ವ್ಯತ್ಯಾಸವನ್ನೇ ಮರೆತಿತ್ತು.",
      te: "దుమ్ముతో మసకబారిన సూర్యుని కింద కర్ణుడు తన చివరి రోజును ఎదుర్కొంటూ నిలిచాడు. అతని చుట్టూ ఉన్న యుద్ధభూమి విజయానికీ దుఃఖానికీ మధ్య తేడాను మరచిపోయింది.",
    },
  },
  {
    id: "ch0-panel-02-last-stand",
    scope: "chapter-0",
    sequence: 2,
    role: "narrator",
    text: {
      en: "His arrows crossed the field like light through a storm. Skill could still shape the moment, though it could no longer change its end.",
      hi: "उनके बाण तूफ़ान में चमकती रोशनी की तरह रणभूमि पार कर रहे थे। कौशल अब भी उस क्षण को आकार दे सकता था, पर उसके अंत को नहीं बदल सकता था।",
      ta: "புயலைக் கிழிக்கும் ஒளிபோல் அவனது அம்புகள் களத்தைக் கடந்தன. திறமை அந்தக் கணத்தை இன்னும் வடிவமைக்க முடிந்தது; ஆனால் அதன் முடிவை மாற்ற முடியவில்லை.",
      kn: "ಬಿರುಗಾಳಿಯನ್ನು ಚೀರುವ ಬೆಳಕಿನಂತೆ ಅವನ ಬಾಣಗಳು ರಣಭೂಮಿಯನ್ನು ದಾಟಿದವು. ಕೌಶಲ್ಯ ಆ ಕ್ಷಣವನ್ನು ಇನ್ನೂ ರೂಪಿಸಬಹುದಾಗಿತ್ತು, ಆದರೆ ಅದರ ಅಂತ್ಯವನ್ನು ಬದಲಾಯಿಸಲಾರದು.",
      te: "తుఫానును చీల్చే వెలుగులా అతని బాణాలు యుద్ధభూమిని దాటాయి. నైపుణ్యం ఆ క్షణాన్ని ఇంకా మలచగలిగింది, కానీ దాని ముగింపును మార్చలేకపోయింది.",
    },
  },
  {
    id: "ch0-panel-03-wheel",
    scope: "chapter-0",
    sequence: 3,
    role: "narrator",
    text: {
      en: "Then the chariot wheel sank into the earth. Old curses, old choices, and the weight of fate closed around him.",
      hi: "फिर रथ का पहिया धरती में धँस गया। पुराने शाप, पुराने निर्णय और भाग्य का भार उनके चारों ओर घिर आए।",
      ta: "பின்னர் தேர்ச் சக்கரம் மண்ணுக்குள் புதைந்தது. பழைய சாபங்களும் பழைய முடிவுகளும் விதியின் பாரமும் அவனைச் சூழ்ந்தன.",
      kn: "ನಂತರ ರಥದ ಚಕ್ರ ಭೂಮಿಯಲ್ಲಿ ಹೂತುಹೋಯಿತು. ಹಳೆಯ ಶಾಪಗಳು, ಹಳೆಯ ಆಯ್ಕೆಗಳು ಮತ್ತು ವಿಧಿಯ ಭಾರ ಅವನನ್ನು ಸುತ್ತುವರಿದವು.",
      te: "తర్వాత రథచక్రం భూమిలో కూరుకుపోయింది. పాత శాపాలు, పాత నిర్ణయాలు, విధి భారం అతన్ని చుట్టుముట్టాయి.",
    },
  },
  {
    id: "ch0-panel-04-pause-owed",
    scope: "chapter-0",
    sequence: 4,
    role: "narrator",
    text: {
      en: "Karna set down his bow and lifted the wheel. He asked for the pause owed to an unarmed warrior.",
      hi: "कर्ण ने धनुष नीचे रखा और पहिया उठाने लगे। उन्होंने निहत्थे योद्धा को मिलने वाले विराम की माँग की।",
      ta: "கர்ணன் தனது வில்லை கீழே வைத்து சக்கரத்தைத் தூக்க முயன்றான். ஆயுதமற்ற வீரனுக்குரிய இடைவெளியை அவன் கேட்டான்.",
      kn: "ಕರ್ಣನು ತನ್ನ ಬಿಲ್ಲನ್ನು ಕೆಳಗಿಟ್ಟು ಚಕ್ರವನ್ನು ಎತ್ತಲು ಮುಂದಾದನು. ನಿರಾಯುಧ ಯೋಧನಿಗೆ ಸಲ್ಲಬೇಕಾದ ವಿರಾಮವನ್ನು ಅವನು ಕೇಳಿದನು.",
      te: "కర్ణుడు తన విల్లును కిందపెట్టి చక్రాన్ని ఎత్తడానికి ప్రయత్నించాడు. నిరాయుధ యోధుడికి ఇవ్వాల్సిన విరామాన్ని కోరాడు.",
    },
  },
  {
    id: "ch0-panel-05-what-remained",
    scope: "chapter-0",
    sequence: 5,
    role: "narrator",
    text: {
      en: "The story cuts to ash. His surviving son inherited a name, a wound, and a war he did not choose.",
      hi: "कथा राख पर आकर रुकती है। उनके जीवित पुत्र को एक नाम, एक घाव और ऐसा युद्ध विरासत में मिला जिसे उसने नहीं चुना था।",
      ta: "கதை சாம்பலிடம் வந்து நிற்கிறது. உயிருடன் மீந்த அவன் மகனுக்கு ஒரு பெயரும் ஒரு காயமும் அவன் தேர்ந்தெடுக்காத ஒரு போரும் மரபாகக் கிடைத்தன.",
      kn: "ಕಥೆ ಬೂದಿಯ ಬಳಿ ಬಂದು ನಿಲ್ಲುತ್ತದೆ. ಬದುಕುಳಿದ ಅವನ ಮಗನಿಗೆ ಒಂದು ಹೆಸರು, ಒಂದು ಗಾಯ ಮತ್ತು ಅವನು ಆರಿಸದ ಯುದ್ಧವು ಪರಂಪರೆಯಾಗಿ ಸಿಕ್ಕವು.",
      te: "కథ బూడిద దగ్గర ఆగుతుంది. బ్రతికి మిగిలిన అతని కుమారుడికి ఒక పేరు, ఒక గాయం, తాను ఎంచుకోని ఒక యుద్ధం వారసత్వంగా వచ్చాయి.",
    },
  },
  {
    id: "ch1-kunti-revelation",
    scope: "chapter-1",
    sequence: 1,
    role: "kunti",
    text: {
      en: "After the war, the secret was spoken. Karna had been my first son. Vrishaketu entered the house of the men who killed his father.",
      hi: "युद्ध के बाद रहस्य कह दिया गया। कर्ण मेरा पहला पुत्र था। वृषकेतु उन लोगों के घर में आया जिन्होंने उसके पिता को मारा था।",
      ta: "போருக்குப் பிறகு அந்த ரகசியம் சொல்லப்பட்டது. கர்ணன் என் முதல் மகன். தனது தந்தையைக் கொன்றவர்களின் இல்லத்திற்குள் விருஷகேது வந்தான்.",
      kn: "ಯುದ್ಧದ ನಂತರ ಆ ರಹಸ್ಯವನ್ನು ಹೇಳಲಾಯಿತು. ಕರ್ಣನು ನನ್ನ ಮೊದಲ ಮಗ. ತನ್ನ ತಂದೆಯನ್ನು ಕೊಂದವರ ಮನೆಯೊಳಗೆ ವೃಷಕೇತು ಬಂದನು.",
      te: "యుద్ధం తర్వాత ఆ రహస్యం బయటపడింది. కర్ణుడు నా మొదటి కుమారుడు. తన తండ్రిని చంపిన వారి ఇంటిలోకి వృషకేతు అడుగుపెట్టాడు.",
    },
  },
  {
    id: "ch1-raid-begins",
    scope: "chapter-1",
    sequence: 2,
    role: "narrator",
    text: {
      en: "The army had gone with the royal sacrifice. Raiders entered the unguarded charioteers' quarter.",
      hi: "सेना राजकीय यज्ञ के साथ जा चुकी थी। हमलावर असुरक्षित सारथियों की बस्ती में घुस आए।",
      ta: "அரச யாகத்துடன் படை சென்றிருந்தது. காவலற்ற தேரோட்டிகளின் குடியிருப்புக்குள் கொள்ளையர்கள் நுழைந்தனர்.",
      kn: "ರಾಜಯಜ್ಞದೊಂದಿಗೆ ಸೇನೆ ಹೊರಟಿತ್ತು. ಕಾವಲಿಲ್ಲದ ಸಾರಥಿಗಳ ಬಡಾವಣೆಗೆ ದಾಳಿಕೋರರು ನುಗ್ಗಿದರು.",
      te: "రాజయజ్ఞంతో పాటు సైన్యం వెళ్లిపోయింది. కాపలా లేని సారథుల వాడలోకి దుండగులు చొరబడ్డారు.",
    },
  },
  {
    id: "ch1-opening-mission",
    scope: "chapter-0",
    sequence: 8,
    role: "vrishaketu",
    text: {
      en: "The army rode out with the royal horse. No guard is left in this quarter tonight. Raiders are in the lanes, taking children. These people sheltered Karna's son when no one else would. So tonight I stand for them. Up the lane to the courtyard, before the raiders reach it.",
      hi: "सेना राजसी अश्व के साथ निकल चुकी है। आज रात इस बस्ती में कोई पहरा नहीं। लुटेरे गलियों में हैं, बच्चों को उठा रहे हैं। इन्हीं लोगों ने कर्ण के पुत्र को शरण दी थी, जब और कोई न था। इसलिए आज रात मैं इनके लिए खड़ा हूँ। गली से ऊपर, आँगन तक — उनके पहुँचने से पहले।",
      ta: "படையினர் அரச குதிரையுடன் புறப்பட்டுவிட்டனர். இன்றிரவு இந்தக் குடியிருப்பில் காவல் இல்லை. கொள்ளையர்கள் தெருக்களில் இருக்கிறார்கள், குழந்தைகளை இழுத்துச் செல்கிறார்கள். வேறு யாரும் இல்லாதபோது கர்ணனின் மகனுக்கு இவர்கள்தான் இடம் தந்தார்கள். எனவே இன்றிரவு நான் இவர்களுக்காக நிற்கிறேன். தெருவழியே மேலே, முற்றத்திற்கு — அவர்கள் அங்கு போவதற்கு முன்.",
      kn: "ಸೈನ್ಯ ರಾಜಾಶ್ವದೊಂದಿಗೆ ಹೊರಟುಹೋಗಿದೆ. ಇಂದು ರಾತ್ರಿ ಈ ಬಡಾವಣೆಗೆ ಕಾವಲಿಲ್ಲ. ದರೋಡೆಕೋರರು ಬೀದಿಗಳಲ್ಲಿದ್ದಾರೆ, ಮಕ್ಕಳನ್ನು ಎಳೆದೊಯ್ಯುತ್ತಿದ್ದಾರೆ. ಬೇರೆ ಯಾರೂ ಇಲ್ಲದಾಗ ಕರ್ಣನ ಮಗನಿಗೆ ಆಶ್ರಯ ಕೊಟ್ಟವರು ಇವರೇ. ಆದ್ದರಿಂದ ಇಂದು ರಾತ್ರಿ ನಾನು ಇವರಿಗಾಗಿ ನಿಲ್ಲುತ್ತೇನೆ. ಬೀದಿಯ ಮೇಲಕ್ಕೆ, ಅಂಗಳದವರೆಗೆ — ಅವರು ತಲುಪುವ ಮೊದಲು.",
      te: "సైన్యం రాజాశ్వంతో బయలుదేరిపోయింది. ఈ రాత్రి ఈ వీధికి కాపలా లేదు. దోపిడీదారులు సందుల్లో ఉన్నారు, పిల్లలను ఎత్తుకుపోతున్నారు. మరెవరూ లేనప్పుడు కర్ణుడి కొడుకుకు ఆశ్రయమిచ్చినవాళ్ళు వీళ్ళే. అందుకే ఈ రాత్రి నేను వీళ్ళ కోసం నిలబడతాను. సందు పైకి, ఆవరణ దాకా — వాళ్ళు చేరుకోకముందే.",
    },
  },
  {
    id: "ch1-raider-call-one",
    scope: "chapter-1",
    sequence: 3,
    role: "raider-one",
    text: {
      en: "Find Karna's son. He is here.",
      hi: "कर्ण के पुत्र को खोजो। वह यहीं है।",
      ta: "கர்ணனின் மகனைத் தேடுங்கள். அவன் இங்கே இருக்கிறான்.",
      kn: "ಕರ್ಣನ ಮಗನನ್ನು ಹುಡುಕಿ. ಅವನು ಇಲ್ಲಿಯೇ ಇದ್ದಾನೆ.",
      te: "కర్ణుడి కుమారుడిని వెతకండి. అతను ఇక్కడే ఉన్నాడు.",
    },
  },
  {
    id: "ch1-raider-call-two",
    scope: "chapter-1",
    sequence: 4,
    role: "raider-two",
    text: {
      en: "Block the doorway. Do not let him pass.",
      hi: "द्वार रोक दो। उसे आगे मत जाने देना।",
      ta: "வாசலை மறியுங்கள். அவனை கடந்து செல்ல விடாதீர்கள்.",
      kn: "ಬಾಗಿಲನ್ನು ತಡೆಯಿರಿ. ಅವನನ್ನು ಮುಂದೆ ಹೋಗಲು ಬಿಡಬೇಡಿ.",
      te: "ద్వారాన్ని అడ్డుకోండి. అతన్ని దాటనివ్వకండి.",
    },
  },
  {
    id: "ch1-chitra-final",
    scope: "chapter-1",
    sequence: 5,
    role: "chitra",
    text: {
      en: "They asked for you by name.",
      hi: "उन्होंने तुम्हारा नाम लेकर पूछा था।",
      ta: "அவர்கள் உன்னைப் பெயர் சொல்லிக் கேட்டார்கள்.",
      kn: "ಅವರು ನಿನ್ನ ಹೆಸರನ್ನೇ ಹೇಳಿ ಕೇಳಿದರು.",
      te: "వారు నీ పేరే చెప్పి అడిగారు.",
    },
  },
  {
    id: "ch1-dawn-road",
    scope: "chapter-1",
    sequence: 6,
    role: "narrator",
    text: {
      en: "At dawn, the royal horse was released. Its road followed the raiders' trail.",
      hi: "भोर में राजकीय अश्व को छोड़ दिया गया। उसका मार्ग हमलावरों के निशानों के पीछे चला।",
      ta: "விடியற்காலையில் அரச குதிரை விடப்பட்டது. அதன் பாதை கொள்ளையர்களின் தடத்தைத் தொடர்ந்தது.",
      kn: "ಬೆಳಗಿನ ಜಾವ ರಾಜಾಶ್ವವನ್ನು ಬಿಡಲಾಯಿತು. ಅದರ ದಾರಿ ದಾಳಿಕೋರರ ಹೆಜ್ಜೆಗುರುತುಗಳನ್ನು ಹಿಂಬಾಲಿಸಿತು.",
      te: "ఉషోదయాన రాజాశ్వాన్ని విడిచారు. దాని దారి దుండగుల జాడను అనుసరించింది.",
    },
  },
  {
    id: "ch1-vrishaketu-oath",
    scope: "chapter-1",
    sequence: 7,
    role: "vrishaketu",
    text: {
      en: "Then I will follow the horse and find who sent them.",
      hi: "तब मैं उस अश्व के पीछे जाऊँगा और पता लगाऊँगा कि उन्हें किसने भेजा था।",
      ta: "அப்படியானால் நான் அந்தக் குதிரையைப் பின்தொடர்ந்து அவர்களை அனுப்பியது யார் என்று கண்டுபிடிப்பேன்.",
      kn: "ಹಾಗಾದರೆ ನಾನು ಆ ಕುದುರೆಯನ್ನು ಹಿಂಬಾಲಿಸಿ ಅವರನ್ನು ಕಳುಹಿಸಿದವರು ಯಾರು ಎಂದು ಕಂಡುಹಿಡಿಯುತ್ತೇನೆ.",
      te: "అయితే నేను ఆ గుర్రాన్ని అనుసరించి వారిని పంపింది ఎవరో కనుగొంటాను.",
    },
  },
];

export const EXPECTED_VOICE_ASSET_COUNT =
  FIXED_VOICE_LINES.length * VOICE_LOCALES.length;
