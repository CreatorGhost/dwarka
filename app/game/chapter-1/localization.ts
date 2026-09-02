import type { ChapterPhase } from "./progress";

export const locales = ["en", "hi", "ta", "kn", "te"] as const;
export type Locale = (typeof locales)[number];

export const languageNames: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
  ta: "தமிழ்",
  kn: "ಕನ್ನಡ",
  te: "తెలుగు",
};

type StoryPanelCopy = { title: string; text: string };
type ArchiveStoryCopy = { title: string; subtitle: string; who: string; spark: string; goal: string; verdict: string; read: string };

export type ChapterDictionary = {
  languageChooser: { title: string; description: string };
  home: {
    eyebrow: string;
    title: string;
    deck: string;
    beginChapter0: string;
    beginChapter1: string;
    continueChapter1: string;
    replayChapter1: string;
    chapter0Detail: string;
    chapter1Detail: string;
    complete: string;
    replayStory: string;
    settings: string;
    readAllStories: string;
    heroAlt: string;
    heroCaptionLabel: string;
    heroCaption: string;
    confirmedDirection: string;
    premiseTitle: string;
    premise: string;
    archiveLabel: string;
    whoYouPlay: string;
    whatStarts: string;
    whatYouDo: string;
    decisionChapter: string;
    decisionTitle: string;
    decisionBody: string;
    stories: ArchiveStoryCopy[];
  };
  chapter0: {
    label: string;
    attribution: string;
    close: string;
    back: string;
    captionsOn: string;
    captionsOff: string;
    mute: string;
    unmute: string;
    skip: string;
    next: string;
    beginChapter1: string;
    skipLabel: string;
    skipTitle: string;
    skipBody: string;
    cancel: string;
    skipConfirm: string;
    voiceUnavailable: string;
    panels: StoryPanelCopy[];
  };
  phases: Record<ChapterPhase, string>;
  settings: {
    title: string;
    language: string;
    textLanguage: string;
    voiceLanguage: string;
    audio: string;
    master: string;
    music: string;
    effects: string;
    voice: string;
    muteAll: string;
    accessibility: string;
    captions: string;
    speakerNames: string;
    cameraShake: string;
    tutorials: string;
    resetTutorials: string;
    controls: string;
    progress: string;
    done: string;
    reset: string;
    resetLabel: string;
    resetTitle: string;
    resetBody: string;
    resetConfirm: string;
    cancel: string;
  };
  controls: {
    movement: string;
    mouse: string;
    leftMouse: string;
    rightMouse: string;
    bow: string;
    blade: string;
    contextual: string;
    sprint: string;
    dodge: string;
    interact: string;
    pause: string;
  };
};

export const dictionaries: Record<Locale, ChapterDictionary> = {
  en: {
    languageChooser: { title: "Choose your language", description: "This sets the story, game text, captions, and voice. You can change text and voice separately in Settings." },
    home: {
      eyebrow: "DWARKA / VRISHAKETU", title: "The wound the legend left behind.",
      deck: "Read Karna's final day. Then take the bow as his surviving son and protect the quarter that still remembers his name.",
      beginChapter0: "Begin Chapter 0", beginChapter1: "Begin Chapter 1", continueChapter1: "Continue Chapter 1", replayChapter1: "Replay Chapter 1",
      chapter0Detail: "The Wheel · a five-panel illustrated story", chapter1Detail: "The Boy with the Paper Sun", complete: "Chapter 1 complete",
      replayStory: "Replay story", settings: "Settings", readAllStories: "Read all stories", heroAlt: "Vrishaketu takes an oath beneath a gold sun",
      heroCaptionLabel: "CHAPTER 1 · PLAYABLE NOW", heroCaption: "The Boy with the Paper Sun · a third-person night raid through Karna's quarter.",
      confirmedDirection: "The confirmed direction", premiseTitle: "Play the person who inherits the wound, not the legend who caused it.",
      premise: "Chapter 0 preserves Karna's story as illustrated narration. Chapter 1 belongs to Vrishaketu: mortal, young, and able to win without rewriting the Mahabharata.",
      archiveLabel: "Story archive", whoYouPlay: "Who you play", whatStarts: "What starts the story", whatYouDo: "What you must do",
      decisionChapter: "Chapter 1", decisionTitle: "The Boy with the Paper Sun.", decisionBody: "Three families. Three encounters. One road at dawn. The chapter ends with Vrishaketu's oath; it never begins Chapter 2.",
      stories: [
        { title: "Vrishaketu", subtitle: "The Last Arrow of the Sun", who: "Karna's surviving son, raised and trained by Arjuna, the man who killed his father.", spark: "Raiders kill his young foster-brother Chitra and leave one message: they came looking for Vrishaketu.", goal: "Guard the wandering royal horse because its road follows the raiders' trail.", verdict: "Confirmed game", read: "Read all 32 panels" },
        { title: "Emberborn", subtitle: "The Forest That Was Burned", who: "An original Naga-Nishada survivor of the burning of Khandava forest.", spark: "His cousin kidnaps his sister to bind her life to a weapon made from the forest's last ember.", goal: "Save his sister and stop the survivors from answering one massacre with another.", verdict: "Story archive", read: "Read the complete chapter" },
        { title: "Babhruvahana", subtitle: "The Gem Beneath the World", who: "The prince of Manipur, raised without knowing his father Arjuna.", spark: "He wins a duel, then learns the stranger he killed was his own father.", goal: "Enter the Naga underworld and recover the life-gem before the dead can no longer be revived.", verdict: "Story archive", read: "Read the complete chapter" },
        { title: "Abhimanyu", subtitle: "The Seventh Gate", who: "Arjuna's sixteen-year-old son, who knows how to enter the Chakravyuha but not how to escape it.", spark: "The army needs him to break the formation after Arjuna is drawn away.", goal: "Cross seven gates while the promised rescue falls farther behind.", verdict: "Reference only", read: "Read the complete chapter" },
      ],
    },
    chapter0: {
      label: "CHAPTER 0 · THE WHEEL", attribution: "Adapted from the Jaiminiya Ashvamedha Parva and later regional traditions.", close: "Close illustrated story", back: "Back", captionsOn: "Captions on", captionsOff: "Captions off", mute: "Mute", unmute: "Unmute", skip: "Skip", next: "Next", beginChapter1: "Begin Chapter 1", skipLabel: "SKIP CHAPTER 0?", skipTitle: "Begin Chapter 1 now?", skipBody: "You can replay the illustrated story from the homepage later.", cancel: "Cancel", skipConfirm: "Skip and begin", voiceUnavailable: "Voice unavailable. The complete localized narration remains visible.",
      panels: [
        { title: "Kurukshetra · Day Seventeen", text: "Karna stood for his last day beneath a sun dimmed by dust. Around him, the field had forgotten the difference between victory and grief." },
        { title: "The last stand", text: "His arrows crossed the field like light through a storm. Skill could still shape the moment, though it could no longer change its end." },
        { title: "The wheel", text: "Then the chariot wheel sank into the earth. Old curses, old choices, and the weight of fate closed around him." },
        { title: "The pause owed", text: "Karna set down his bow and lifted the wheel. He asked for the pause owed to an unarmed warrior." },
        { title: "What remained", text: "The story cuts to ash. His surviving son inherited a name, a wound, and a war he did not choose." },
      ],
    },
    phases: { arrival: "Return to the quarter", courtyard: "Protect the courtyard family", market: "Clear the market bend", doorway: "Reach the charioteers' doorway", ending: "The paper sun", complete: "Chapter 1 complete" },
    settings: { title: "Settings", language: "Language", textLanguage: "Text language", voiceLanguage: "Voice language", audio: "Audio", master: "Master", music: "Music", effects: "Effects", voice: "Voice", muteAll: "Mute all", accessibility: "Accessibility", captions: "Captions", speakerNames: "Speaker names", cameraShake: "Camera shake", tutorials: "Tutorial prompts", resetTutorials: "Reset tutorial prompts", controls: "Controls", progress: "Progress", done: "Done", reset: "Reset Chapter 1 progress", resetLabel: "RESET PROGRESS?", resetTitle: "Return to a first visit?", resetBody: "This removes the story flag, player ID, signed checkpoint, and chapter summary. Language, audio, and accessibility preferences remain.", resetConfirm: "Reset progress", cancel: "Cancel" },
    controls: { movement: "Approach, retreat, and strafe", mouse: "Turn the camera", leftMouse: "Left mouse", rightMouse: "Right mouse", bow: "Hold right mouse to aim; left mouse fires", blade: "Release right mouse; left mouse attacks", contextual: "Bow and blade are contextual. There is no weapon-switch key; holding aim automatically locks a valid enemy in view.", sprint: "Sprint", dodge: "Dodge", interact: "Interact", pause: "Pause" },
  },
  hi: {
    languageChooser: { title: "अपनी भाषा चुनें", description: "यह कहानी, खेल के पाठ, कैप्शन और आवाज़ की भाषा तय करता है। सेटिंग्स में पाठ और आवाज़ अलग-अलग बदले जा सकते हैं।" },
    home: {
      eyebrow: "द्वारका / वृषकेतु", title: "वह घाव जो किंवदंती पीछे छोड़ गई।", deck: "कर्ण के अंतिम दिन को पढ़ें। फिर उनके जीवित पुत्र के रूप में धनुष उठाएँ और उस बस्ती की रक्षा करें जो आज भी उनका नाम याद रखती है।",
      beginChapter0: "अध्याय 0 शुरू करें", beginChapter1: "अध्याय 1 शुरू करें", continueChapter1: "अध्याय 1 जारी रखें", replayChapter1: "अध्याय 1 फिर खेलें", chapter0Detail: "पहिया · पाँच चित्रों की कथा", chapter1Detail: "कागज़ी सूरज वाला बालक", complete: "अध्याय 1 पूरा हुआ", replayStory: "कथा फिर देखें", settings: "सेटिंग्स", readAllStories: "सभी कथाएँ पढ़ें", heroAlt: "स्वर्णिम सूर्य के नीचे वृषकेतु की शपथ", heroCaptionLabel: "अध्याय 1 · अब खेलने योग्य", heroCaption: "कागज़ी सूरज वाला बालक · कर्ण की बस्ती में तीसरे व्यक्ति का रात्रि अभियान।", confirmedDirection: "निश्चित दिशा", premiseTitle: "उस व्यक्ति के रूप में खेलें जिसे घाव विरासत में मिला, उस किंवदंती के रूप में नहीं जिसने उसे जन्म दिया।", premise: "अध्याय 0 कर्ण की कथा को चित्रित वर्णन के रूप में सहेजता है। अध्याय 1 वृषकेतु का है: एक नश्वर युवा जो महाभारत को बदले बिना जीत सकता है।", archiveLabel: "कथा संग्रह", whoYouPlay: "आप किसके रूप में खेलते हैं", whatStarts: "कथा कैसे शुरू होती है", whatYouDo: "आपको क्या करना है", decisionChapter: "अध्याय 1", decisionTitle: "कागज़ी सूरज वाला बालक।", decisionBody: "तीन परिवार। तीन मुठभेड़ें। भोर की एक राह। अध्याय वृषकेतु की शपथ पर समाप्त होता है; अध्याय 2 शुरू नहीं होता।",
      stories: [
        { title: "वृषकेतु", subtitle: "सूर्य का अंतिम बाण", who: "कर्ण का जीवित पुत्र, जिसे उसके पिता का वध करने वाले अर्जुन ने पाला और प्रशिक्षित किया।", spark: "हमलावर उसके छोटे पालक-भाई चित्रा को मारते हैं और संदेश छोड़ते हैं: वे वृषकेतु को खोज रहे थे।", goal: "भटकते राजकीय अश्व की रक्षा करें, क्योंकि उसकी राह हमलावरों के निशान का पीछा करती है।", verdict: "निश्चित खेल", read: "सभी 32 चित्र पढ़ें" },
        { title: "अंगारजन्मा", subtitle: "जला हुआ वन", who: "खांडव वन की आग से बचा एक मूल नाग-निषाद।", spark: "उसका चचेरा भाई उसकी बहन को वन की अंतिम चिनगारी से बने अस्त्र से बाँधने के लिए अगवा करता है।", goal: "बहन को बचाएँ और बचे लोगों को एक नरसंहार का उत्तर दूसरे नरसंहार से देने से रोकें।", verdict: "कथा संग्रह", read: "पूरा अध्याय पढ़ें" },
        { title: "बभ्रुवाहन", subtitle: "धरती के नीचे की मणि", who: "मणिपुर का राजकुमार, जो अपने पिता अर्जुन को जाने बिना बड़ा हुआ।", spark: "वह द्वंद्व जीतता है, फिर जानता है कि मारा गया अजनबी उसका पिता था।", goal: "नाग लोक में जाकर जीवन-मणि लौटाएँ, इससे पहले कि मृतकों को जीवित करना असंभव हो जाए।", verdict: "कथा संग्रह", read: "पूरा अध्याय पढ़ें" },
        { title: "अभिमन्यु", subtitle: "सातवाँ द्वार", who: "अर्जुन का सोलह वर्षीय पुत्र, जो चक्रव्यूह में प्रवेश करना जानता है, निकलना नहीं।", spark: "अर्जुन को दूर ले जाने के बाद सेना को व्यूह तोड़ने के लिए उसकी आवश्यकता पड़ती है।", goal: "सात द्वार पार करें, जबकि वादा किया गया बचाव पीछे छूटता जाए।", verdict: "केवल संदर्भ", read: "पूरा अध्याय पढ़ें" },
      ],
    },
    chapter0: { label: "अध्याय 0 · पहिया", attribution: "जैमिनीय अश्वमेध पर्व और बाद की क्षेत्रीय परंपराओं से रूपांतरित।", close: "चित्रित कथा बंद करें", back: "पीछे", captionsOn: "कैप्शन चालू", captionsOff: "कैप्शन बंद", mute: "मौन करें", unmute: "आवाज़ चालू करें", skip: "छोड़ें", next: "आगे", beginChapter1: "अध्याय 1 शुरू करें", skipLabel: "अध्याय 0 छोड़ें?", skipTitle: "अभी अध्याय 1 शुरू करें?", skipBody: "आप बाद में मुखपृष्ठ से चित्रित कथा फिर देख सकते हैं।", cancel: "रद्द करें", skipConfirm: "छोड़कर शुरू करें", voiceUnavailable: "आवाज़ उपलब्ध नहीं है। पूरा स्थानीय कथन दिखाई देता रहेगा।", panels: [
      { title: "कुरुक्षेत्र · सत्रहवाँ दिन", text: "धूल से धुँधले सूरज के नीचे कर्ण अपने अंतिम दिन के लिए खड़े थे। उनके चारों ओर रणभूमि विजय और शोक का अंतर भूल चुकी थी।" },
      { title: "अंतिम प्रतिरोध", text: "उनके बाण तूफान में प्रकाश की तरह रणभूमि पार करते थे। कौशल उस क्षण को आकार दे सकता था, पर उसका अंत नहीं बदल सकता था।" },
      { title: "पहिया", text: "तभी रथ का पहिया धरती में धँस गया। पुराने शाप, पुराने चुनाव और नियति का भार उन्हें घेरने लगा।" },
      { title: "वह विराम जो मिलना चाहिए था", text: "कर्ण ने धनुष रखकर पहिया उठाया। उन्होंने निहत्थे योद्धा को मिलने वाला विराम माँगा।" },
      { title: "जो बचा", text: "कथा राख पर कटती है। उनके जीवित पुत्र को एक नाम, एक घाव और ऐसा युद्ध विरासत में मिला जिसे उसने नहीं चुना था।" },
    ] },
    phases: { arrival: "बस्ती में लौटें", courtyard: "आँगन के परिवार की रक्षा करें", market: "बाज़ार का मोड़ खाली करें", doorway: "सारथियों के द्वार तक पहुँचें", ending: "कागज़ी सूरज", complete: "अध्याय 1 पूरा हुआ" },
    settings: { title: "सेटिंग्स", language: "भाषा", textLanguage: "पाठ की भाषा", voiceLanguage: "आवाज़ की भाषा", audio: "ध्वनि", master: "मुख्य", music: "संगीत", effects: "प्रभाव", voice: "आवाज़", muteAll: "सभी ध्वनियाँ बंद", accessibility: "सुलभता", captions: "कैप्शन", speakerNames: "वक्ता के नाम", cameraShake: "कैमरा कंपन", tutorials: "मार्गदर्शक संकेत", resetTutorials: "मार्गदर्शक संकेत फिर दिखाएँ", controls: "नियंत्रण", progress: "प्रगति", done: "पूर्ण", reset: "अध्याय 1 की प्रगति रीसेट करें", resetLabel: "प्रगति रीसेट करें?", resetTitle: "पहली यात्रा पर लौटें?", resetBody: "यह कथा चिह्न, खिलाड़ी आईडी, हस्ताक्षरित पड़ाव और अध्याय सारांश हटाता है। भाषा, ध्वनि और सुलभता की पसंद बनी रहती हैं।", resetConfirm: "प्रगति रीसेट करें", cancel: "रद्द करें" },
    controls: { movement: "आगे, पीछे और दाएँ-बाएँ चलें", mouse: "कैमरा घुमाएँ", leftMouse: "बायाँ माउस", rightMouse: "दायाँ माउस", bow: "निशाना लगाने के लिए दायाँ माउस दबाएँ; बायाँ माउस बाण चलाता है", blade: "दायाँ माउस छोड़ें; बायाँ माउस तलवार चलाता है", contextual: "धनुष और तलवार परिस्थिति के अनुसार बदलते हैं। हथियार बदलने की अलग कुंजी नहीं है; निशाना थामने पर सामने का सही शत्रु अपने आप लॉक होता है।", sprint: "तेज़ दौड़", dodge: "बचाव छलाँग", interact: "बात/क्रिया", pause: "विराम" },
  },
  ta: {
    languageChooser: { title: "உங்கள் மொழியைத் தேர்ந்தெடுக்கவும்", description: "இது கதை, விளையாட்டு உரை, வசனங்கள் மற்றும் குரலை அமைக்கும். அமைப்புகளில் உரை மற்றும் குரலைத் தனித்தனியாக மாற்றலாம்." },
    home: {
      eyebrow: "துவாரகா / விருஷகேது", title: "புராணம் விட்டுச் சென்ற காயம்.", deck: "கர்ணனின் இறுதி நாளைப் படியுங்கள். பின்னர் அவரது உயிர் பிழைத்த மகனாக வில்லை ஏந்தி, அவரது பெயரை இன்னும் நினைவில் வைத்திருக்கும் குடியிருப்பைக் காப்பாற்றுங்கள்.", beginChapter0: "அத்தியாயம் 0 தொடங்கு", beginChapter1: "அத்தியாயம் 1 தொடங்கு", continueChapter1: "அத்தியாயம் 1 தொடர்க", replayChapter1: "அத்தியாயம் 1 மீண்டும் விளையாடு", chapter0Detail: "சக்கரம் · ஐந்து படங்களைக் கொண்ட கதை", chapter1Detail: "காகிதச் சூரியன் கொண்ட சிறுவன்", complete: "அத்தியாயம் 1 முடிந்தது", replayStory: "கதையை மீண்டும் காண்க", settings: "அமைப்புகள்", readAllStories: "அனைத்து கதைகளையும் படிக்க", heroAlt: "தங்கச் சூரியனின் கீழ் விருஷகேது சபதம் செய்கிறார்", heroCaptionLabel: "அத்தியாயம் 1 · இப்போது விளையாடலாம்", heroCaption: "காகிதச் சூரியன் கொண்ட சிறுவன் · கர்ணனின் குடியிருப்பில் ஒரு மூன்றாம் நபர் இரவுத் தாக்குதல்.", confirmedDirection: "உறுதி செய்யப்பட்ட பாதை", premiseTitle: "காயத்தைப் பெற்றவராக விளையாடுங்கள்; அதை ஏற்படுத்திய புராண நாயகனாக அல்ல.", premise: "அத்தியாயம் 0 கர்ணனின் கதையை ஓவிய உரையாகக் காக்கிறது. அத்தியாயம் 1 விருஷகேதுவுக்குரியது: மகாபாரதத்தை மாற்றாமல் வெல்லக்கூடிய இளம் மனிதன்.", archiveLabel: "கதைத் தொகுப்பு", whoYouPlay: "நீங்கள் யாராக விளையாடுகிறீர்கள்", whatStarts: "கதை எப்படித் தொடங்குகிறது", whatYouDo: "நீங்கள் செய்ய வேண்டியது", decisionChapter: "அத்தியாயம் 1", decisionTitle: "காகிதச் சூரியன் கொண்ட சிறுவன்.", decisionBody: "மூன்று குடும்பங்கள். மூன்று மோதல்கள். விடியலில் ஒரு பாதை. அத்தியாயம் விருஷகேதுவின் சபதத்துடன் முடிகிறது; அத்தியாயம் 2 தொடங்காது.",
      stories: [
        { title: "விருஷகேது", subtitle: "சூரியனின் கடைசி அம்பு", who: "கர்ணனின் உயிர் பிழைத்த மகன்; தனது தந்தையைக் கொன்ற அர்ஜுனனால் வளர்க்கப்பட்டு பயிற்றுவிக்கப்பட்டவர்.", spark: "தாக்குதலாளர்கள் அவரது இளம் வளர்ப்பு சகோதரன் சித்ராவைக் கொன்று, விருஷகேதுவைத் தேடி வந்ததாகச் செய்தி விடுகிறார்கள்.", goal: "தாக்குதலாளர்களின் தடத்தைத் தொடர்ந்து செல்லும் அரசக் குதிரையைப் பாதுகாக்கவும்.", verdict: "உறுதி செய்யப்பட்ட விளையாட்டு", read: "32 படங்களையும் படிக்க" },
        { title: "நெருப்பில் பிறந்தவன்", subtitle: "எரிக்கப்பட்ட காடு", who: "காண்டவ வனத் தீயில் உயிர் பிழைத்த ஒரு நாக-நிஷாதர்.", spark: "வனத்தின் கடைசி நெருப்பில் உருவான ஆயுதத்துடன் அவளது உயிரை இணைக்க அவரது உறவினர் சகோதரியைக் கடத்துகிறார்.", goal: "சகோதரியைக் காப்பாற்றி, ஒரு படுகொலைக்கு இன்னொன்றால் பதிலளிப்பதைத் தடுக்கவும்.", verdict: "கதைத் தொகுப்பு", read: "முழு அத்தியாயத்தையும் படிக்க" },
        { title: "பப்ருவாகனன்", subtitle: "உலகின் அடியில் உள்ள மணி", who: "தன் தந்தை அர்ஜுனனை அறியாமல் வளர்ந்த மணிப்பூர் இளவரசர்.", spark: "அவர் ஒரு சண்டையில் வென்று, தான் கொன்ற அந்நியர் தனது தந்தை என்பதை அறிகிறார்.", goal: "நாக உலகிற்குள் சென்று, இறந்தவர்களை உயிர்ப்பிக்க முடியாத முன் உயிர்-மணியை மீட்கவும்.", verdict: "கதைத் தொகுப்பு", read: "முழு அத்தியாயத்தையும் படிக்க" },
        { title: "அபிமன்யு", subtitle: "ஏழாவது வாயில்", who: "சக்கரவியூகத்தில் நுழையத் தெரிந்தும் வெளியேறத் தெரியாத அர்ஜுனனின் பதினாறு வயது மகன்.", spark: "அர்ஜுனன் விலக்கப்பட்ட பின் படைக்கு வியூகத்தை உடைக்க அவன் தேவைப்படுகிறான்.", goal: "வாக்குறுதியளிக்கப்பட்ட உதவி மேலும் பின்தங்கும் போது ஏழு வாயில்களைக் கடக்கவும்.", verdict: "குறிப்புக்கு மட்டும்", read: "முழு அத்தியாயத்தையும் படிக்க" },
      ],
    },
    chapter0: { label: "அத்தியாயம் 0 · சக்கரம்", attribution: "ஜைமினிய அசுவமேத பர்வம் மற்றும் பிற்கால வட்டார மரபுகளைத் தழுவியது.", close: "ஓவியக் கதையை மூடு", back: "பின்", captionsOn: "வசனங்கள் இயக்கு", captionsOff: "வசனங்கள் நிறுத்து", mute: "ஒலி நிறுத்து", unmute: "ஒலி இயக்கு", skip: "தவிர்", next: "அடுத்து", beginChapter1: "அத்தியாயம் 1 தொடங்கு", skipLabel: "அத்தியாயம் 0-ஐ தவிர்க்கவா?", skipTitle: "அத்தியாயம் 1-ஐ இப்போது தொடங்கவா?", skipBody: "முகப்புப் பக்கத்திலிருந்து ஓவியக் கதையைப் பின்னர் மீண்டும் பார்க்கலாம்.", cancel: "ரத்து", skipConfirm: "தவிர்த்து தொடங்கு", voiceUnavailable: "குரல் கிடைக்கவில்லை. முழு உள்ளூர் உரை தொடர்ந்து தெரியும்.", panels: [
      { title: "குருக்ஷேத்திரம் · பதினேழாம் நாள்", text: "தூசியால் மங்கிய சூரியனின் கீழ் கர்ணன் தனது இறுதி நாளுக்காக நின்றார். அவரைச் சுற்றிய போர்க்களம் வெற்றிக்கும் துயரத்திற்கும் இடையிலான வேறுபாட்டை மறந்திருந்தது." },
      { title: "இறுதி நிலைப்பாடு", text: "அவரது அம்புகள் புயலில் ஒளியைப் போல களத்தைக் கடந்தன. திறமை அந்தத் தருணத்தை வடிவமைக்க முடிந்தது; அதன் முடிவை மாற்ற முடியவில்லை." },
      { title: "சக்கரம்", text: "பின்னர் தேர்ச் சக்கரம் மண்ணில் புதைந்தது. பழைய சாபங்கள், பழைய முடிவுகள், விதியின் சுமை அவரைச் சூழ்ந்தன." },
      { title: "அளிக்க வேண்டிய இடைவேளை", text: "கர்ணன் வில்லை கீழே வைத்து சக்கரத்தைத் தூக்கினார். ஆயுதமற்ற வீரனுக்குக் கிடைக்க வேண்டிய இடைவேளையைக் கேட்டார்." },
      { title: "மீதமிருந்தது", text: "கதை சாம்பலுக்குத் தாவுகிறது. அவரது உயிர் பிழைத்த மகன் தான் தேர்ந்தெடுக்காத ஒரு பெயர், ஒரு காயம், ஒரு போரைப் பெற்றான்." },
    ] },
    phases: { arrival: "குடியிருப்புக்குத் திரும்பு", courtyard: "முற்றத்து குடும்பத்தைக் காப்பாற்று", market: "சந்தை வளைவைத் தூய்மைப்படுத்து", doorway: "தேரோட்டிகளின் வாசலை அடை", ending: "காகிதச் சூரியன்", complete: "அத்தியாயம் 1 முடிந்தது" },
    settings: { title: "அமைப்புகள்", language: "மொழி", textLanguage: "உரை மொழி", voiceLanguage: "குரல் மொழி", audio: "ஒலி", master: "மொத்த ஒலி", music: "இசை", effects: "ஒலி விளைவுகள்", voice: "குரல்", muteAll: "அனைத்தையும் ஒலியற்று வை", accessibility: "அணுகல்தன்மை", captions: "வசனங்கள்", speakerNames: "பேசுபவர் பெயர்கள்", cameraShake: "கேமரா அசைவு", tutorials: "பயிற்சி குறிப்புகள்", resetTutorials: "பயிற்சி குறிப்புகளை மீட்டமை", controls: "கட்டுப்பாடுகள்", progress: "முன்னேற்றம்", done: "முடிந்தது", reset: "அத்தியாயம் 1 முன்னேற்றத்தை மீட்டமை", resetLabel: "முன்னேற்றத்தை மீட்டமைக்கவா?", resetTitle: "முதல் வருகைக்குத் திரும்பவா?", resetBody: "இது கதை குறி, வீரர் ஐடி, கையொப்பமிட்ட சோதனைச் சாவடி மற்றும் அத்தியாயச் சுருக்கத்தை நீக்கும். மொழி, ஒலி, அணுகல்தன்மை விருப்பங்கள் இருக்கும்.", resetConfirm: "முன்னேற்றத்தை மீட்டமை", cancel: "ரத்து" },
    controls: { movement: "முன்னேறு, பின்வாங்கு, பக்கவாட்டில் நகரு", mouse: "கேமராவைத் திருப்பு", leftMouse: "இடது மவுஸ்", rightMouse: "வலது மவுஸ்", bow: "குறிவைக்க வலது மவுஸைப் பிடி; இடது மவுஸ் அம்பு எய்யும்", blade: "வலது மவுஸை விடு; இடது மவுஸ் வாளால் தாக்கும்", contextual: "வில் மற்றும் வாள் சூழலுக்கேற்ப மாறும். ஆயுதம் மாற்ற தனி விசை இல்லை; குறியைப் பிடித்தால் பார்வையில் உள்ள சரியான எதிரி தானாகப் பூட்டப்படும்.", sprint: "வேக ஓட்டம்", dodge: "தவிர்த்து உருள்", interact: "தொடர்பு", pause: "இடைநிறுத்தம்" },
  },
  kn: {
    languageChooser: { title: "ನಿಮ್ಮ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ", description: "ಇದು ಕಥೆ, ಆಟದ ಪಠ್ಯ, ಶೀರ್ಷಿಕೆಗಳು ಮತ್ತು ಧ್ವನಿಯನ್ನು ಹೊಂದಿಸುತ್ತದೆ. ಸೆಟ್ಟಿಂಗ್‌ಗಳಲ್ಲಿ ಪಠ್ಯ ಮತ್ತು ಧ್ವನಿಯನ್ನು ಪ್ರತ್ಯೇಕವಾಗಿ ಬದಲಾಯಿಸಬಹುದು." },
    home: {
      eyebrow: "ದ್ವಾರಕಾ / ವೃಷಕೇತು", title: "ದಂತಕಥೆ ಬಿಟ್ಟುಹೋದ ಗಾಯ.", deck: "ಕರ್ಣನ ಕೊನೆಯ ದಿನವನ್ನು ಓದಿ. ನಂತರ ಅವನ ಬದುಕುಳಿದ ಮಗನಾಗಿ ಬಿಲ್ಲು ಹಿಡಿದು, ಇನ್ನೂ ಅವನ ಹೆಸರನ್ನು ನೆನಪಿಡುವ ಬಡಾವಣೆಯನ್ನು ರಕ್ಷಿಸಿ.", beginChapter0: "ಅಧ್ಯಾಯ 0 ಪ್ರಾರಂಭಿಸಿ", beginChapter1: "ಅಧ್ಯಾಯ 1 ಪ್ರಾರಂಭಿಸಿ", continueChapter1: "ಅಧ್ಯಾಯ 1 ಮುಂದುವರಿಸಿ", replayChapter1: "ಅಧ್ಯಾಯ 1 ಮತ್ತೆ ಆಡಿ", chapter0Detail: "ಚಕ್ರ · ಐದು ಚಿತ್ರಗಳ ಕಥೆ", chapter1Detail: "ಕಾಗದದ ಸೂರ್ಯನ ಬಾಲಕ", complete: "ಅಧ್ಯಾಯ 1 ಪೂರ್ಣವಾಗಿದೆ", replayStory: "ಕಥೆಯನ್ನು ಮತ್ತೆ ನೋಡಿ", settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು", readAllStories: "ಎಲ್ಲ ಕಥೆಗಳನ್ನು ಓದಿ", heroAlt: "ಚಿನ್ನದ ಸೂರ್ಯನ ಕೆಳಗೆ ವೃಷಕೇತು ಪ್ರಮಾಣ ಮಾಡುತ್ತಾನೆ", heroCaptionLabel: "ಅಧ್ಯಾಯ 1 · ಈಗ ಆಡಬಹುದು", heroCaption: "ಕಾಗದದ ಸೂರ್ಯನ ಬಾಲಕ · ಕರ್ಣನ ಬಡಾವಣೆಯಲ್ಲಿ ಮೂರನೇ ವ್ಯಕ್ತಿಯ ರಾತ್ರಿಯ ದಾಳಿ.", confirmedDirection: "ದೃಢಪಡಿಸಿದ ದಿಕ್ಕು", premiseTitle: "ಗಾಯವನ್ನು ಪಡೆದವನಾಗಿ ಆಡಿ; ಅದನ್ನು ಉಂಟುಮಾಡಿದ ದಂತಕಥೆಯಾಗಿ ಅಲ್ಲ.", premise: "ಅಧ್ಯಾಯ 0 ಕರ್ಣನ ಕಥೆಯನ್ನು ಚಿತ್ರಿತ ನಿರೂಪಣೆಯಾಗಿ ಉಳಿಸುತ್ತದೆ. ಅಧ್ಯಾಯ 1 ವೃಷಕೇತುವಿನದು: ಮಹಾಭಾರತವನ್ನು ಬದಲಿಸದೆ ಗೆಲ್ಲಬಲ್ಲ ಯುವ ಮನುಷ್ಯ.", archiveLabel: "ಕಥಾ ಸಂಗ್ರಹ", whoYouPlay: "ನೀವು ಯಾರಾಗಿ ಆಡುತ್ತೀರಿ", whatStarts: "ಕಥೆ ಹೇಗೆ ಆರಂಭವಾಗುತ್ತದೆ", whatYouDo: "ನೀವು ಮಾಡಬೇಕಾದದ್ದು", decisionChapter: "ಅಧ್ಯಾಯ 1", decisionTitle: "ಕಾಗದದ ಸೂರ್ಯನ ಬಾಲಕ.", decisionBody: "ಮೂರು ಕುಟುಂಬಗಳು. ಮೂರು ಕಾಳಗಗಳು. ಮುಂಜಾನೆಯ ಒಂದು ದಾರಿ. ಅಧ್ಯಾಯ ವೃಷಕೇತುವಿನ ಪ್ರಮಾಣದೊಂದಿಗೆ ಮುಗಿಯುತ್ತದೆ; ಅಧ್ಯಾಯ 2 ಆರಂಭವಾಗುವುದಿಲ್ಲ.",
      stories: [
        { title: "ವೃಷಕೇತು", subtitle: "ಸೂರ್ಯನ ಕೊನೆಯ ಬಾಣ", who: "ಕರ್ಣನ ಬದುಕುಳಿದ ಮಗ; ತನ್ನ ತಂದೆಯನ್ನು ಕೊಂದ ಅರ್ಜುನನಿಂದ ಬೆಳೆದು ತರಬೇತಿ ಪಡೆದವನು.", spark: "ದಾಳಿಕೋರರು ಅವನ ಕಿರಿಯ ಸಾಕು ಸಹೋದರ ಚಿತ್ರನನ್ನು ಕೊಂದು, ವೃಷಕೇತುವನ್ನು ಹುಡುಕಿಕೊಂಡು ಬಂದೆವು ಎಂಬ ಸಂದೇಶ ಬಿಡುತ್ತಾರೆ.", goal: "ದಾಳಿಕೋರರ ಜಾಡನ್ನು ಹಿಂಬಾಲಿಸುವ ಸಂಚಾರಿ ರಾಜಾಶ್ವವನ್ನು ಕಾಪಾಡಿ.", verdict: "ದೃಢಪಡಿಸಿದ ಆಟ", read: "ಎಲ್ಲ 32 ಚಿತ್ರಗಳನ್ನು ಓದಿ" },
        { title: "ಕೆಂಡಜನ್ಮ", subtitle: "ಸುಟ್ಟುಹೋದ ಅರಣ್ಯ", who: "ಖಾಂಡವ ಅರಣ್ಯದ ಬೆಂಕಿಯಿಂದ ಬದುಕುಳಿದ ಮೂಲ ನಾಗ-ನಿಷಾದ.", spark: "ಅರಣ್ಯದ ಕೊನೆಯ ಕೆಂಡದಿಂದ ಮಾಡಿದ ಆಯುಧಕ್ಕೆ ಅವಳ ಜೀವವನ್ನು ಕಟ್ಟಲು ಅವನ ಸಂಬಂಧಿ ಸಹೋದರಿಯನ್ನು ಅಪಹರಿಸುತ್ತಾನೆ.", goal: "ಸಹೋದರಿಯನ್ನು ಉಳಿಸಿ, ಒಂದು ಹತ್ಯಾಕಾಂಡಕ್ಕೆ ಮತ್ತೊಂದರಿಂದ ಉತ್ತರಿಸುವುದನ್ನು ತಡೆಯಿರಿ.", verdict: "ಕಥಾ ಸಂಗ್ರಹ", read: "ಪೂರ್ಣ ಅಧ್ಯಾಯ ಓದಿ" },
        { title: "ಬಭ್ರುವಾಹನ", subtitle: "ಭೂಮಿಯ ಕೆಳಗಿನ ಮಣಿ", who: "ತನ್ನ ತಂದೆ ಅರ್ಜುನನನ್ನು ತಿಳಿಯದೆ ಬೆಳೆದ ಮಣಿಪುರದ ರಾಜಕುಮಾರ.", spark: "ಅವನು ದ್ವಂದ್ವದಲ್ಲಿ ಗೆದ್ದು, ಕೊಂದ ಅಪರಿಚಿತನೇ ತನ್ನ ತಂದೆ ಎಂದು ತಿಳಿಯುತ್ತಾನೆ.", goal: "ನಾಗ ಲೋಕಕ್ಕೆ ಹೋಗಿ, ಮೃತರನ್ನು ಬದುಕಿಸಲಾಗದ ಮೊದಲು ಜೀವಮಣಿಯನ್ನು ಮರಳಿ ಪಡೆಯಿರಿ.", verdict: "ಕಥಾ ಸಂಗ್ರಹ", read: "ಪೂರ್ಣ ಅಧ್ಯಾಯ ಓದಿ" },
        { title: "ಅಭಿಮನ್ಯು", subtitle: "ಏಳನೇ ದ್ವಾರ", who: "ಚಕ್ರವ್ಯೂಹ ಪ್ರವೇಶಿಸಲು ತಿಳಿದಿದ್ದರೂ ಹೊರಬರಲು ತಿಳಿಯದ ಅರ್ಜುನನ ಹದಿನಾರು ವರ್ಷದ ಮಗ.", spark: "ಅರ್ಜುನನನ್ನು ದೂರ ಸೆಳೆದ ನಂತರ ವ್ಯೂಹ ಒಡೆಯಲು ಸೈನ್ಯಕ್ಕೆ ಅವನು ಬೇಕಾಗುತ್ತಾನೆ.", goal: "ವಾಗ್ದಾನ ಮಾಡಿದ ನೆರವು ಹಿಂದೆ ಬೀಳುವಾಗ ಏಳು ದ್ವಾರಗಳನ್ನು ದಾಟಿ.", verdict: "ಉಲ್ಲೇಖ ಮಾತ್ರ", read: "ಪೂರ್ಣ ಅಧ್ಯಾಯ ಓದಿ" },
      ],
    },
    chapter0: { label: "ಅಧ್ಯಾಯ 0 · ಚಕ್ರ", attribution: "ಜೈಮಿನೀಯ ಅಶ್ವಮೇಧ ಪರ್ವ ಮತ್ತು ನಂತರದ ಪ್ರಾದೇಶಿಕ ಪರಂಪರೆಗಳಿಂದ ರೂಪಾಂತರಿಸಲಾಗಿದೆ.", close: "ಚಿತ್ರಿತ ಕಥೆಯನ್ನು ಮುಚ್ಚಿ", back: "ಹಿಂದೆ", captionsOn: "ಶೀರ್ಷಿಕೆಗಳು ಆನ್", captionsOff: "ಶೀರ್ಷಿಕೆಗಳು ಆಫ್", mute: "ಧ್ವನಿ ನಿಲ್ಲಿಸಿ", unmute: "ಧ್ವನಿ ಚಾಲು ಮಾಡಿ", skip: "ಬಿಟ್ಟುಬಿಡಿ", next: "ಮುಂದೆ", beginChapter1: "ಅಧ್ಯಾಯ 1 ಪ್ರಾರಂಭಿಸಿ", skipLabel: "ಅಧ್ಯಾಯ 0 ಬಿಟ್ಟುಬಿಡಬೇಕೇ?", skipTitle: "ಅಧ್ಯಾಯ 1 ಈಗ ಪ್ರಾರಂಭಿಸಬೇಕೇ?", skipBody: "ಮುಖಪುಟದಿಂದ ಚಿತ್ರಿತ ಕಥೆಯನ್ನು ನಂತರ ಮತ್ತೆ ನೋಡಬಹುದು.", cancel: "ರದ್ದು", skipConfirm: "ಬಿಟ್ಟು ಪ್ರಾರಂಭಿಸಿ", voiceUnavailable: "ಧ್ವನಿ ಲಭ್ಯವಿಲ್ಲ. ಸಂಪೂರ್ಣ ಸ್ಥಳೀಯ ನಿರೂಪಣೆ ಕಾಣುತ್ತಲೇ ಇರುತ್ತದೆ.", panels: [
      { title: "ಕುರುಕ್ಷೇತ್ರ · ಹದಿನೇಳನೇ ದಿನ", text: "ಧೂಳಿನಿಂದ ಮಂಕಾದ ಸೂರ್ಯನ ಕೆಳಗೆ ಕರ್ಣನು ತನ್ನ ಕೊನೆಯ ದಿನಕ್ಕಾಗಿ ನಿಂತನು. ಅವನ ಸುತ್ತಲಿನ ರಣರಂಗ ಗೆಲುವು ಮತ್ತು ದುಃಖದ ವ್ಯತ್ಯಾಸವನ್ನು ಮರೆತಿತ್ತು." },
      { title: "ಕೊನೆಯ ಹೋರಾಟ", text: "ಅವನ ಬಾಣಗಳು ಬಿರುಗಾಳಿಯ ಬೆಳಕಿನಂತೆ ಕಣವನ್ನು ದಾಟಿದವು. ಕೌಶಲ್ಯ ಆ ಕ್ಷಣವನ್ನು ರೂಪಿಸಬಹುದಿತ್ತು; ಅದರ ಅಂತ್ಯವನ್ನು ಬದಲಿಸಲಿಲ್ಲ." },
      { title: "ಚಕ್ರ", text: "ಆಗ ರಥದ ಚಕ್ರ ಭೂಮಿಯಲ್ಲಿ ಹೂತುಹೋಯಿತು. ಹಳೆಯ ಶಾಪಗಳು, ಹಳೆಯ ಆಯ್ಕೆಗಳು ಮತ್ತು ವಿಧಿಯ ಭಾರ ಅವನನ್ನು ಸುತ್ತುವರಿದವು." },
      { title: "ನೀಡಬೇಕಾಗಿದ್ದ ವಿರಾಮ", text: "ಕರ್ಣನು ಬಿಲ್ಲನ್ನು ಕೆಳಗಿಟ್ಟು ಚಕ್ರವನ್ನು ಎತ್ತಿದನು. ನಿರಾಯುಧ ಯೋಧನಿಗೆ ಸಲ್ಲಬೇಕಾದ ವಿರಾಮವನ್ನು ಕೇಳಿದನು." },
      { title: "ಉಳಿದದ್ದು", text: "ಕಥೆ ಬೂದಿಗೆ ಬದಲಾಗುತ್ತದೆ. ಅವನ ಬದುಕುಳಿದ ಮಗ ತಾನು ಆರಿಸದ ಹೆಸರು, ಗಾಯ ಮತ್ತು ಯುದ್ಧವನ್ನು ಪಡೆದನು." },
    ] },
    phases: { arrival: "ಬಡಾವಣೆಗೆ ಮರಳಿ", courtyard: "ಅಂಗಳದ ಕುಟುಂಬವನ್ನು ರಕ್ಷಿಸಿ", market: "ಮಾರುಕಟ್ಟೆಯ ತಿರುವನ್ನು ತೆರವುಗೊಳಿಸಿ", doorway: "ಸಾರಥಿಗಳ ಬಾಗಿಲು ತಲುಪಿ", ending: "ಕಾಗದದ ಸೂರ್ಯ", complete: "ಅಧ್ಯಾಯ 1 ಪೂರ್ಣವಾಗಿದೆ" },
    settings: { title: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು", language: "ಭಾಷೆ", textLanguage: "ಪಠ್ಯದ ಭಾಷೆ", voiceLanguage: "ಧ್ವನಿಯ ಭಾಷೆ", audio: "ಧ್ವನಿ", master: "ಒಟ್ಟು ಧ್ವನಿ", music: "ಸಂಗೀತ", effects: "ಪರಿಣಾಮಗಳು", voice: "ಮಾತಿನ ಧ್ವನಿ", muteAll: "ಎಲ್ಲ ಧ್ವನಿ ನಿಲ್ಲಿಸಿ", accessibility: "ಸುಲಭ ಬಳಕೆ", captions: "ಶೀರ್ಷಿಕೆಗಳು", speakerNames: "ಮಾತನಾಡುವವರ ಹೆಸರುಗಳು", cameraShake: "ಕ್ಯಾಮೆರಾ ಕಂಪನ", tutorials: "ತರಬೇತಿ ಸೂಚನೆಗಳು", resetTutorials: "ತರಬೇತಿ ಸೂಚನೆಗಳನ್ನು ಮರುಹೊಂದಿಸಿ", controls: "ನಿಯಂತ್ರಣಗಳು", progress: "ಪ್ರಗತಿ", done: "ಮುಗಿದಿದೆ", reset: "ಅಧ್ಯಾಯ 1 ಪ್ರಗತಿಯನ್ನು ಮರುಹೊಂದಿಸಿ", resetLabel: "ಪ್ರಗತಿಯನ್ನು ಮರುಹೊಂದಿಸಬೇಕೇ?", resetTitle: "ಮೊದಲ ಭೇಟಿಗೆ ಮರಳಬೇಕೇ?", resetBody: "ಇದು ಕಥೆಯ ಗುರುತು, ಆಟಗಾರರ ಐಡಿ, ಸಹಿ ಮಾಡಿದ ತಪಾಸಣಾ ಹಂತ ಮತ್ತು ಅಧ್ಯಾಯದ ಸಾರಾಂಶವನ್ನು ತೆಗೆದುಹಾಕುತ್ತದೆ. ಭಾಷೆ, ಧ್ವನಿ ಮತ್ತು ಸುಲಭ ಬಳಕೆ ಆಯ್ಕೆಗಳು ಉಳಿಯುತ್ತವೆ.", resetConfirm: "ಪ್ರಗತಿಯನ್ನು ಮರುಹೊಂದಿಸಿ", cancel: "ರದ್ದು" },
    controls: { movement: "ಮುಂದೆ, ಹಿಂದೆ ಮತ್ತು ಪಕ್ಕಕ್ಕೆ ಚಲಿಸಿ", mouse: "ಕ್ಯಾಮೆರಾ ತಿರುಗಿಸಿ", leftMouse: "ಎಡ ಮೌಸ್", rightMouse: "ಬಲ ಮೌಸ್", bow: "ಗುರಿಗೆ ಬಲ ಮೌಸ್ ಹಿಡಿ; ಎಡ ಮೌಸ್ ಬಾಣ ಬಿಡುತ್ತದೆ", blade: "ಬಲ ಮೌಸ್ ಬಿಡಿ; ಎಡ ಮೌಸ್ ಕತ್ತಿಯಿಂದ ಹೊಡೆಯುತ್ತದೆ", contextual: "ಬಿಲ್ಲು ಮತ್ತು ಕತ್ತಿ ಸಂದರ್ಭಕ್ಕೆ ತಕ್ಕಂತೆ ಬದಲಾಗುತ್ತವೆ. ಆಯುಧ ಬದಲಿಸಲು ಪ್ರತ್ಯೇಕ ಕೀ ಇಲ್ಲ; ಗುರಿ ಹಿಡಿದಾಗ ನೋಟದಲ್ಲಿರುವ ಸರಿಯಾದ ಶತ್ರು ಸ್ವಯಂ ಲಾಕ್ ಆಗುತ್ತಾನೆ.", sprint: "ವೇಗವಾಗಿ ಓಡಿ", dodge: "ತಪ್ಪಿಸಿಕೊಳ್ಳಿ", interact: "ಸಂವಹನ", pause: "ವಿರಾಮ" },
  },
  te: {
    languageChooser: { title: "మీ భాషను ఎంచుకోండి", description: "ఇది కథ, ఆట పాఠ్యం, శీర్షికలు మరియు స్వరాన్ని అమర్చుతుంది. సెట్టింగ్స్‌లో పాఠ్యం మరియు స్వరాన్ని విడిగా మార్చవచ్చు." },
    home: {
      eyebrow: "ద్వారకా / వృషకేతు", title: "పురాణం మిగిల్చిన గాయం.", deck: "కర్ణుడి చివరి రోజును చదవండి. తరువాత అతని బతికి ఉన్న కుమారుడిగా విల్లు అందుకొని, ఇప్పటికీ అతని పేరును గుర్తుంచుకున్న వీధిని కాపాడండి.", beginChapter0: "అధ్యాయం 0 ప్రారంభించండి", beginChapter1: "అధ్యాయం 1 ప్రారంభించండి", continueChapter1: "అధ్యాయం 1 కొనసాగించండి", replayChapter1: "అధ్యాయం 1 మళ్లీ ఆడండి", chapter0Detail: "చక్రం · ఐదు చిత్రాల కథ", chapter1Detail: "కాగితపు సూర్యుడున్న బాలుడు", complete: "అధ్యాయం 1 పూర్తైంది", replayStory: "కథను మళ్లీ చూడండి", settings: "సెట్టింగ్స్", readAllStories: "అన్ని కథలు చదవండి", heroAlt: "బంగారు సూర్యుని కింద వృషకేతు ప్రమాణం చేస్తాడు", heroCaptionLabel: "అధ్యాయం 1 · ఇప్పుడు ఆడవచ్చు", heroCaption: "కాగితపు సూర్యుడున్న బాలుడు · కర్ణుడి వీధిలో మూడవ వ్యక్తి రాత్రి దాడి.", confirmedDirection: "నిర్ధారించిన దిశ", premiseTitle: "గాయాన్ని వారసత్వంగా పొందిన వ్యక్తిగా ఆడండి; దాన్ని కలిగించిన పురాణ పురుషుడిగా కాదు.", premise: "అధ్యాయం 0 కర్ణుడి కథను చిత్ర కథనంగా ఉంచుతుంది. అధ్యాయం 1 వృషకేతుది: మహాభారతాన్ని మార్చకుండా గెలవగల యువకుడు.", archiveLabel: "కథల భాండాగారం", whoYouPlay: "మీరు ఎవరిగా ఆడతారు", whatStarts: "కథ ఎలా మొదలవుతుంది", whatYouDo: "మీరు చేయవలసింది", decisionChapter: "అధ్యాయం 1", decisionTitle: "కాగితపు సూర్యుడున్న బాలుడు.", decisionBody: "మూడు కుటుంబాలు. మూడు పోరాటాలు. తెల్లవారుజామున ఒక దారి. అధ్యాయం వృషకేతు ప్రమాణంతో ముగుస్తుంది; అధ్యాయం 2 మొదలవదు.",
      stories: [
        { title: "వృషకేతు", subtitle: "సూర్యుడి చివరి బాణం", who: "కర్ణుడి బతికి ఉన్న కుమారుడు; తన తండ్రిని చంపిన అర్జునుడి చేత పెరిగి శిక్షణ పొందినవాడు.", spark: "దాడిదారులు అతని చిన్న పెంపుడు సోదరుడు చిత్రను చంపి, వృషకేతు కోసం వచ్చామని సందేశం వదులుతారు.", goal: "దాడిదారుల జాడను అనుసరించే సంచార రాజాశ్వాన్ని కాపాడండి.", verdict: "నిర్ధారించిన ఆట", read: "మొత్తం 32 చిత్రాలు చదవండి" },
        { title: "నిప్పులో పుట్టినవాడు", subtitle: "కాల్చబడిన అడవి", who: "ఖాండవ వన దహనం నుంచి బతికిన ఒక నాగ-నిషాదుడు.", spark: "అడవి చివరి నిప్పుతో చేసిన ఆయుధానికి ఆమె ప్రాణాన్ని బంధించడానికి అతని బంధువు సోదరిని అపహరిస్తాడు.", goal: "సోదరిని కాపాడి, ఒక మారణహోమానికి మరొకదానితో జవాబు ఇవ్వకుండా ఆపండి.", verdict: "కథల భాండాగారం", read: "పూర్తి అధ్యాయం చదవండి" },
        { title: "బభ్రువాహనుడు", subtitle: "భూమి కిందనున్న మణి", who: "తన తండ్రి అర్జునుడిని తెలియకుండా పెరిగిన మణిపూర్ యువరాజు.", spark: "అతను ద్వంద్వంలో గెలిచి, తాను చంపిన అపరిచితుడు తన తండ్రే అని తెలుసుకుంటాడు.", goal: "నాగలోకంలోకి వెళ్లి, మృతులను తిరిగి బ్రతికించలేని ముందు జీవమణిని తెచ్చండి.", verdict: "కథల భాండాగారం", read: "పూర్తి అధ్యాయం చదవండి" },
        { title: "అభిమన్యుడు", subtitle: "ఏడవ ద్వారం", who: "చక్రవ్యూహంలో ప్రవేశించడం తెలిసి, బయటకు రావడం తెలియని అర్జునుడి పదహారేళ్ల కుమారుడు.", spark: "అర్జునుడిని దూరంగా లాగిన తరువాత వ్యూహాన్ని ఛేదించడానికి సైన్యానికి అతను అవసరం.", goal: "వాగ్దానం చేసిన సహాయం వెనుకబడుతుండగా ఏడు ద్వారాలు దాటండి.", verdict: "సూచన కోసం మాత్రమే", read: "పూర్తి అధ్యాయం చదవండి" },
      ],
    },
    chapter0: { label: "అధ్యాయం 0 · చక్రం", attribution: "జైమినీయ అశ్వమేధ పర్వం మరియు తరువాతి ప్రాంతీయ సంప్రదాయాల నుండి స్వీకరించబడింది.", close: "చిత్ర కథను మూసివేయండి", back: "వెనుకకు", captionsOn: "శీర్షికలు ఆన్", captionsOff: "శీర్షికలు ఆఫ్", mute: "శబ్దం ఆపండి", unmute: "శబ్దం ఆన్ చేయండి", skip: "దాటవేయండి", next: "తరువాత", beginChapter1: "అధ్యాయం 1 ప్రారంభించండి", skipLabel: "అధ్యాయం 0 దాటవేయాలా?", skipTitle: "అధ్యాయం 1 ఇప్పుడు ప్రారంభించాలా?", skipBody: "హోమ్‌పేజీ నుండి చిత్ర కథను తరువాత మళ్లీ చూడవచ్చు.", cancel: "రద్దు", skipConfirm: "దాటవేసి ప్రారంభించండి", voiceUnavailable: "గొంతు అందుబాటులో లేదు. పూర్తి స్థానిక కథనం కనిపిస్తూనే ఉంటుంది.", panels: [
      { title: "కురుక్షేత్రం · పదిహేడవ రోజు", text: "దుమ్ముతో మసకబారిన సూర్యుని కింద కర్ణుడు తన చివరి రోజు కోసం నిలబడ్డాడు. చుట్టూ ఉన్న యుద్ధభూమి విజయానికి దుఃఖానికి తేడాను మరిచిపోయింది." },
      { title: "చివరి పోరాటం", text: "అతని బాణాలు తుఫానులో వెలుగులా యుద్ధభూమిని దాటాయి. నైపుణ్యం ఆ క్షణాన్ని మలచగలిగింది; దాని ముగింపును మార్చలేకపోయింది." },
      { title: "చక్రం", text: "అప్పుడు రథచక్రం భూమిలో కూరుకుపోయింది. పాత శాపాలు, పాత నిర్ణయాలు, విధి బరువు అతన్ని చుట్టుముట్టాయి." },
      { title: "ఇవ్వవలసిన విరామం", text: "కర్ణుడు విల్లును కింద పెట్టి చక్రాన్ని పైకెత్తాడు. ఆయుధం లేని యోధునికి ఇవ్వవలసిన విరామాన్ని అడిగాడు." },
      { title: "మిగిలింది", text: "కథ బూడిదకు మారుతుంది. అతని బతికి ఉన్న కుమారుడు తాను ఎంచుకోని పేరు, గాయం, యుద్ధాన్ని వారసత్వంగా పొందాడు." },
    ] },
    phases: { arrival: "వీధికి తిరిగి రండి", courtyard: "ప్రాంగణంలోని కుటుంబాన్ని రక్షించండి", market: "మార్కెట్ మలుపును సురక్షితం చేయండి", doorway: "సారథుల ద్వారం చేరండి", ending: "కాగితపు సూర్యుడు", complete: "అధ్యాయం 1 పూర్తైంది" },
    settings: { title: "సెట్టింగ్స్", language: "భాష", textLanguage: "పాఠ్య భాష", voiceLanguage: "స్వర భాష", audio: "ధ్వని", master: "మొత్తం ధ్వని", music: "సంగీతం", effects: "ప్రభావాలు", voice: "స్వరం", muteAll: "అన్ని ధ్వనులు ఆపండి", accessibility: "సౌలభ్యం", captions: "శీర్షికలు", speakerNames: "మాట్లాడేవారి పేర్లు", cameraShake: "కెమెరా కదలిక", tutorials: "శిక్షణ సూచనలు", resetTutorials: "శిక్షణ సూచనలను రీసెట్ చేయండి", controls: "నియంత్రణలు", progress: "పురోగతి", done: "పూర్తి", reset: "అధ్యాయం 1 పురోగతిని రీసెట్ చేయండి", resetLabel: "పురోగతిని రీసెట్ చేయాలా?", resetTitle: "మొదటి సందర్శనకు తిరిగి వెళ్లాలా?", resetBody: "ఇది కథ గుర్తు, ఆటగాడి ఐడి, సంతకం చేసిన తనిఖీ స్థానం మరియు అధ్యాయ సారాంశాన్ని తొలగిస్తుంది. భాష, ధ్వని మరియు సౌలభ్య ఎంపికలు అలాగే ఉంటాయి.", resetConfirm: "పురోగతిని రీసెట్ చేయండి", cancel: "రద్దు" },
    controls: { movement: "ముందుకు, వెనుకకు, పక్కలకు కదలండి", mouse: "కెమెరాను తిప్పండి", leftMouse: "ఎడమ మౌస్", rightMouse: "కుడి మౌస్", bow: "గురి కోసం కుడి మౌస్ పట్టుకోండి; ఎడమ మౌస్ బాణం వేస్తుంది", blade: "కుడి మౌస్ వదలండి; ఎడమ మౌస్ కత్తితో దాడి చేస్తుంది", contextual: "విల్లు, కత్తి సందర్భాన్ని బట్టి మారతాయి. ఆయుధం మార్చడానికి ప్రత్యేక కీ లేదు; గురి పట్టగానే చూపులోని సరైన శత్రువు స్వయంగా లాక్ అవుతాడు.", sprint: "వేగంగా పరుగెత్తండి", dodge: "తప్పించుకోండి", interact: "చర్య", pause: "విరామం" },
  },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
