// What Remi says out loud without the model (fallbacks, greetings, reminders, check-ins), in each
// fully translated language. A family's contact name or "your family" is filled in.
import { langKey, type LangKey } from './i18n';

type Person = { name: string; relation: string } | null;
export type Phrases = {
  fallback: string;
  unsure: (contact: string | null) => string;
  noFace: string;
  helpSent: (contact: string | null) => string;
  recognition: (name: string, relation: string) => string;
  time: (weekday: string, date: string, time: string) => string;
  wake: (name: string) => string;
  wellDone: (name: string) => string;
  checkIns: (name: string, person: Person) => [string, string, string, string];
};

const P: Record<LangKey, Phrases> = {
  en: {
    fallback: "I'm right here with you. Let's take a slow breath together.",
    unsure: (c) => `I'm not sure who this is. Shall I ask ${c ?? 'your family'}?`,
    noFace: "I can't see a face clearly. Let's try again, a little closer.",
    helpSent: (c) => `I've told ${c ?? 'your family'}. Someone will be in touch very soon.`,
    recognition: (n, r) => `This is ${n}, your ${r}.`,
    time: (w, d, t) => `Today is ${w}, ${d}. It is ${t}.`,
    wake: (n) => `Yes, ${n}? I'm listening.`,
    wellDone: (n) => `Well done, ${n}. I've ticked that off.`,
    checkIns: (n, p) => [
      `Hello ${n}. I'm here with you. How are you feeling?`,
      p ? `${n}, would you like to tell me about ${p.name}, your ${p.relation}?` : `${n}, would you like to tell me about your day?`,
      `${n}, shall we have a glass of water together?`,
      `${n}, let's take a slow, easy breath together.`,
    ],
  },
  hi: {
    fallback: 'मैं यहीं आपके साथ हूँ। चलिए साथ में धीरे से साँस लेते हैं।',
    unsure: (c) => `मुझे पक्का नहीं पता कि ये कौन हैं। क्या मैं ${c ?? 'आपके परिवार'} से पूछूँ?`,
    noFace: 'मुझे चेहरा साफ़ नहीं दिख रहा। थोड़ा पास से फिर कोशिश करते हैं।',
    helpSent: (c) => `मैंने ${c ?? 'आपके परिवार'} को बता दिया है। जल्दी ही कोई आपसे बात करेगा।`,
    recognition: (n, r) => `ये ${n} हैं, आपके ${r}।`,
    time: (w, d, t) => `आज ${w} है, ${d}। अभी ${t} बजे हैं।`,
    wake: (n) => `जी ${n}, बोलिए। मैं सुन रहा हूँ।`,
    wellDone: (n) => `बहुत बढ़िया, ${n}। मैंने लिख लिया है।`,
    checkIns: (n, p) => [
      `नमस्ते ${n}। मैं आपके साथ हूँ। आपका मन कैसा है?`,
      p ? `${n}, क्या आप मुझे ${p.name} के बारे में कुछ बताएँगे?` : `${n}, क्या आप मुझे अपने दिन के बारे में बताएँगे?`,
      `${n}, चलिए साथ में एक गिलास पानी पीते हैं।`,
      `${n}, चलिए साथ में धीरे से एक लंबी साँस लेते हैं।`,
    ],
  },
  bn: {
    fallback: 'আমি আপনার পাশেই আছি। চলুন একসাথে ধীরে একটা শ্বাস নিই।',
    unsure: (c) => `আমি ঠিক বুঝতে পারছি না ইনি কে। আমি কি ${c ? `${c}-কে` : 'আপনার পরিবারকে'} জিজ্ঞেস করব?`,
    noFace: 'মুখটা ঠিক দেখতে পাচ্ছি না। আরেকটু কাছে এসে আবার চেষ্টা করি।',
    helpSent: (c) => `আমি ${c ? `${c}-কে` : 'আপনার পরিবারকে'} জানিয়ে দিয়েছি। খুব শিগগিরই কেউ যোগাযোগ করবে।`,
    recognition: (n, r) => `ইনি ${n}, আপনার ${r}।`,
    time: (w, d, t) => `আজ ${w}, ${d}। এখন ${t}।`,
    wake: (n) => `হ্যাঁ ${n}, বলুন। আমি শুনছি।`,
    wellDone: (n) => `খুব ভালো, ${n}। আমি লিখে রেখেছি।`,
    checkIns: (n, p) => [
      `নমস্কার ${n}। আমি আপনার সাথে আছি। আপনার কেমন লাগছে?`,
      p ? `${n}, ${p.name}-এর কথা একটু বলবেন?` : `${n}, আপনার দিনটা কেমন কাটল, বলবেন?`,
      `${n}, চলুন একসাথে এক গ্লাস জল খাই।`,
      `${n}, চলুন একসাথে ধীরে একটা লম্বা শ্বাস নিই।`,
    ],
  },
  ta: {
    fallback: 'நான் உங்கள் அருகிலேயே இருக்கிறேன். சேர்ந்து மெதுவாக ஒரு மூச்சு விடலாம்.',
    unsure: (c) => `இவர் யார் என்று எனக்குச் சரியாகத் தெரியவில்லை. ${c ? `${c}-இடம்` : 'உங்கள் குடும்பத்தினரிடம்'} கேட்கட்டுமா?`,
    noFace: 'முகம் தெளிவாகத் தெரியவில்லை. இன்னும் கொஞ்சம் அருகில் வந்து மீண்டும் முயற்சிப்போம்.',
    helpSent: (c) => `நான் ${c ? `${c}-இடம்` : 'உங்கள் குடும்பத்தினரிடம்'} சொல்லிவிட்டேன். விரைவில் யாராவது தொடர்பு கொள்வார்கள்.`,
    recognition: (n, r) => `இவர் ${n}, உங்கள் ${r}.`,
    time: (w, d, t) => `இன்று ${w}, ${d}. இப்போது மணி ${t}.`,
    wake: (n) => `சொல்லுங்கள் ${n}, நான் கேட்கிறேன்.`,
    wellDone: (n) => `அருமை, ${n}. நான் குறித்துக்கொண்டேன்.`,
    checkIns: (n, p) => [
      `வணக்கம் ${n}. நான் உங்களுடன் இருக்கிறேன். எப்படி இருக்கிறீர்கள்?`,
      p ? `${n}, ${p.name} பற்றி எனக்குக் கொஞ்சம் சொல்கிறீர்களா?` : `${n}, இன்றைய நாள் பற்றிச் சொல்கிறீர்களா?`,
      `${n}, சேர்ந்து ஒரு டம்ளர் தண்ணீர் குடிக்கலாமா?`,
      `${n}, சேர்ந்து மெதுவாக ஒரு நீண்ட மூச்சு விடலாம்.`,
    ],
  },
  te: {
    fallback: 'నేను మీ పక్కనే ఉన్నాను. కలిసి నెమ్మదిగా ఒక శ్వాస తీసుకుందాం.',
    unsure: (c) => `వీరు ఎవరో నాకు సరిగ్గా తెలియడం లేదు. ${c ? `${c}ని` : 'మీ కుటుంబాన్ని'} అడగనా?`,
    noFace: 'ముఖం స్పష్టంగా కనిపించడం లేదు. కొంచెం దగ్గరగా వచ్చి మళ్ళీ ప్రయత్నిద్దాం.',
    helpSent: (c) => `నేను ${c ? `${c}కి` : 'మీ కుటుంబానికి'} చెప్పాను. త్వరలోనే ఎవరైనా మాట్లాడతారు.`,
    recognition: (n, r) => `వీరు ${n}, మీ ${r}.`,
    time: (w, d, t) => `ఈరోజు ${w}, ${d}. ఇప్పుడు సమయం ${t}.`,
    wake: (n) => `చెప్పండి ${n}, నేను వింటున్నాను.`,
    wellDone: (n) => `చాలా బాగుంది, ${n}. నేను రాసుకున్నాను.`,
    checkIns: (n, p) => [
      `నమస్కారం ${n}. నేను మీతోనే ఉన్నాను. మీరు ఎలా ఉన్నారు?`,
      p ? `${n}, ${p.name} గురించి నాకు కొంచెం చెబుతారా?` : `${n}, మీ రోజు గురించి చెబుతారా?`,
      `${n}, కలిసి ఒక గ్లాసు నీళ్ళు తాగుదామా?`,
      `${n}, కలిసి నెమ్మదిగా ఒక దీర్ఘ శ్వాస తీసుకుందాం.`,
    ],
  },
  mr: {
    fallback: 'मी इथेच तुमच्या सोबत आहे. चला, आपण हळूच एक श्वास घेऊया.',
    unsure: (c) => `हे कोण आहेत, मला नक्की कळत नाही. मी ${c ? `${c}ला` : 'तुमच्या कुटुंबाला'} विचारू का?`,
    noFace: 'चेहरा नीट दिसत नाहीये. थोडं जवळ येऊन पुन्हा प्रयत्न करूया.',
    helpSent: (c) => `मी ${c ? `${c}ला` : 'तुमच्या कुटुंबाला'} सांगितलं आहे. लवकरच कोणीतरी बोलेल.`,
    recognition: (n, r) => `हे ${n} आहेत, तुमचे ${r}.`,
    time: (w, d, t) => `आज ${w} आहे, ${d}. आत्ता ${t} वाजले आहेत.`,
    wake: (n) => `हो ${n}, बोला. मी ऐकतोय.`,
    wellDone: (n) => `छान, ${n}. मी लिहून ठेवलं आहे.`,
    checkIns: (n, p) => [
      `नमस्कार ${n}. मी तुमच्या सोबत आहे. कसं वाटतंय?`,
      p ? `${n}, ${p.name} बद्दल मला थोडं सांगाल का?` : `${n}, तुमच्या दिवसाबद्दल सांगाल का?`,
      `${n}, चला, आपण एक ग्लास पाणी पिऊया.`,
      `${n}, चला, हळूच एक लांब श्वास घेऊया.`,
    ],
  },
  ur: {
    fallback: 'میں یہیں آپ کے ساتھ ہوں۔ آئیے مل کر آہستہ سے ایک سانس لیتے ہیں۔',
    unsure: (c) => `مجھے ٹھیک سے نہیں معلوم کہ یہ کون ہیں۔ کیا میں ${c ?? 'آپ کے گھر والوں'} سے پوچھوں؟`,
    noFace: 'چہرہ صاف نظر نہیں آ رہا۔ تھوڑا قریب آ کر پھر کوشش کرتے ہیں۔',
    helpSent: (c) => `میں نے ${c ?? 'آپ کے گھر والوں'} کو بتا دیا ہے۔ جلد ہی کوئی آپ سے رابطہ کرے گا۔`,
    recognition: (n, r) => `یہ ${n} ہیں، آپ کے ${r}۔`,
    time: (w, d, t) => `آج ${w} ہے، ${d}۔ ابھی ${t} بجے ہیں۔`,
    wake: (n) => `جی ${n}، کہیے۔ میں سن رہا ہوں۔`,
    wellDone: (n) => `بہت خوب، ${n}۔ میں نے لکھ لیا ہے۔`,
    checkIns: (n, p) => [
      `السلام علیکم ${n}۔ میں آپ کے ساتھ ہوں۔ آپ کیسا محسوس کر رہے ہیں؟`,
      p ? `${n}، کیا آپ مجھے ${p.name} کے بارے میں کچھ بتائیں گے؟` : `${n}، کیا آپ مجھے اپنے دن کے بارے میں بتائیں گے؟`,
      `${n}، آئیے مل کر ایک گلاس پانی پیتے ہیں۔`,
      `${n}، آئیے مل کر آہستہ سے ایک لمبی سانس لیتے ہیں۔`,
    ],
  },
  es: {
    fallback: 'Estoy aquí contigo. Respiremos despacio, juntos.',
    unsure: (c) => `No estoy segura de quién es. ¿Le pregunto a ${c ?? 'tu familia'}?`,
    noFace: 'No veo bien la cara. Probemos otra vez, un poco más cerca.',
    helpSent: (c) => `Ya le avisé a ${c ?? 'tu familia'}. Alguien se pondrá en contacto muy pronto.`,
    recognition: (n, r) => `Es ${n}, tu ${r}.`,
    time: (w, d, t) => `Hoy es ${w}, ${d}. Son las ${t}.`,
    wake: (n) => `¿Sí, ${n}? Te escucho.`,
    wellDone: (n) => `¡Muy bien, ${n}! Ya lo anoté.`,
    checkIns: (n, p) => [
      `Hola, ${n}. Estoy aquí contigo. ¿Cómo te sientes?`,
      p ? `${n}, ¿me cuentas algo de ${p.name}?` : `${n}, ¿me cuentas cómo va tu día?`,
      `${n}, ¿tomamos un vaso de agua juntos?`,
      `${n}, respiremos despacio, juntos.`,
    ],
  },
  fr: {
    fallback: 'Je suis là, avec vous. Respirons doucement ensemble.',
    unsure: (c) => `Je ne suis pas sûre de qui c'est. Voulez-vous que je demande à ${c ?? 'votre famille'} ?`,
    noFace: 'Je ne vois pas bien le visage. Essayons encore, un peu plus près.',
    helpSent: (c) => `J'ai prévenu ${c ?? 'votre famille'}. Quelqu'un vous contactera très bientôt.`,
    recognition: (n, r) => `C'est ${n}, votre ${r}.`,
    time: (w, d, t) => `Nous sommes ${w}, ${d}. Il est ${t}.`,
    wake: (n) => `Oui, ${n} ? Je vous écoute.`,
    wellDone: (n) => `Bravo, ${n}. C'est noté.`,
    checkIns: (n, p) => [
      `Bonjour ${n}. Je suis là, avec vous. Comment vous sentez-vous ?`,
      p ? `${n}, vous me parlez un peu de ${p.name} ?` : `${n}, vous me racontez votre journée ?`,
      `${n}, et si nous buvions un verre d'eau ensemble ?`,
      `${n}, respirons doucement, ensemble.`,
    ],
  },
  de: {
    fallback: 'Ich bin hier bei Ihnen. Lassen Sie uns zusammen ruhig atmen.',
    unsure: (c) => `Ich bin nicht sicher, wer das ist. Soll ich ${c ?? 'Ihre Familie'} fragen?`,
    noFace: 'Ich kann das Gesicht nicht gut sehen. Versuchen wir es noch einmal, etwas näher.',
    helpSent: (c) => `Ich habe ${c ?? 'Ihrer Familie'} Bescheid gesagt. Es meldet sich gleich jemand.`,
    recognition: (n, r) => `Das ist ${n}, ${r}.`,
    time: (w, d, t) => `Heute ist ${w}, der ${d}. Es ist ${t}.`,
    wake: (n) => `Ja, ${n}? Ich höre zu.`,
    wellDone: (n) => `Sehr gut, ${n}. Ich habe es abgehakt.`,
    checkIns: (n, p) => [
      `Hallo ${n}. Ich bin bei Ihnen. Wie geht es Ihnen?`,
      p ? `${n}, erzählen Sie mir ein wenig von ${p.name}?` : `${n}, erzählen Sie mir von Ihrem Tag?`,
      `${n}, wollen wir zusammen ein Glas Wasser trinken?`,
      `${n}, lassen Sie uns ruhig und tief durchatmen.`,
    ],
  },
  pt: {
    fallback: 'Estou aqui com você. Vamos respirar devagar, juntos.',
    unsure: (c) => `Não tenho certeza de quem é. Quer que eu pergunte para ${c ?? 'sua família'}?`,
    noFace: 'Não consigo ver bem o rosto. Vamos tentar de novo, um pouco mais perto.',
    helpSent: (c) => `Já avisei ${c ?? 'sua família'}. Alguém vai entrar em contato logo.`,
    recognition: (n, r) => `Este é ${n}, ${r}.`,
    time: (w, d, t) => `Hoje é ${w}, ${d}. Agora são ${t}.`,
    wake: (n) => `Sim, ${n}? Estou ouvindo.`,
    wellDone: (n) => `Muito bem, ${n}! Já anotei.`,
    checkIns: (n, p) => [
      `Olá, ${n}. Estou aqui com você. Como você está se sentindo?`,
      p ? `${n}, me conta um pouco sobre ${p.name}?` : `${n}, me conta como está o seu dia?`,
      `${n}, vamos tomar um copo d'água juntos?`,
      `${n}, vamos respirar devagar, juntos.`,
    ],
  },
  ar: {
    fallback: 'أنا هنا بجانبك. لنأخذ نفسًا بطيئًا معًا.',
    unsure: (c) => `لست متأكدة من هذا الشخص. هل أسأل ${c ?? 'عائلتك'}؟`,
    noFace: 'لا أرى الوجه بوضوح. لنحاول مرة أخرى، أقرب قليلًا.',
    helpSent: (c) => `لقد أخبرت ${c ?? 'عائلتك'}. سيتواصل معك أحد قريبًا جدًا.`,
    recognition: (n, r) => `هذا ${n}، ${r}.`,
    time: (w, d, t) => `اليوم ${w}، ${d}. الساعة الآن ${t}.`,
    wake: (n) => `نعم يا ${n}؟ أنا أستمع.`,
    wellDone: (n) => `أحسنت يا ${n}. لقد سجّلت ذلك.`,
    checkIns: (n, p) => [
      `مرحبًا ${n}. أنا معك. كيف تشعر الآن؟`,
      p ? `${n}، هل تحدثني قليلًا عن ${p.name}؟` : `${n}، هل تحدثني عن يومك؟`,
      `${n}، ما رأيك أن نشرب كوب ماء معًا؟`,
      `${n}، لنأخذ نفسًا طويلًا وهادئًا معًا.`,
    ],
  },
  zh: {
    fallback: '我就在你身边。我们一起慢慢地深呼吸。',
    unsure: (c) => `我不太确定这是谁。要我问问${c ?? '你的家人'}吗？`,
    noFace: '我看不清脸。我们再靠近一点试试。',
    helpSent: (c) => `我已经告诉${c ?? '你的家人'}了。很快就会有人联系你。`,
    recognition: (n, r) => `这是${n}，你的${r}。`,
    time: (w, d, t) => `今天是${d}，${w}。现在是${t}。`,
    wake: (n) => `${n}，我在听呢。`,
    wellDone: (n) => `做得好，${n}！我记下来了。`,
    checkIns: (n, p) => [
      `你好，${n}。我陪着你呢。你感觉怎么样？`,
      p ? `${n}，跟我说说${p.name}好吗？` : `${n}，跟我说说你今天过得怎么样？`,
      `${n}，我们一起喝杯水吧。`,
      `${n}，我们一起慢慢地深呼吸。`,
    ],
  },
  ja: {
    fallback: 'ここにいますよ。一緒にゆっくり深呼吸しましょう。',
    unsure: (c) => `どなたか、はっきり分かりません。${c ?? 'ご家族'}に聞いてみましょうか？`,
    noFace: 'お顔がよく見えません。もう少し近くで、もう一度試しましょう。',
    helpSent: (c) => `${c ?? 'ご家族'}に伝えました。すぐに連絡がありますよ。`,
    recognition: (n, r) => `こちらは${n}さん、あなたの${r}です。`,
    time: (w, d, t) => `今日は${d}、${w}です。今は${t}です。`,
    wake: (n) => `はい、${n}さん。聞いていますよ。`,
    wellDone: (n) => `よくできました、${n}さん。記録しておきますね。`,
    checkIns: (n, p) => [
      `こんにちは、${n}さん。そばにいますよ。ご気分はいかがですか？`,
      p ? `${n}さん、${p.name}さんのことを少し聞かせてくれますか？` : `${n}さん、今日のことを聞かせてくれますか？`,
      `${n}さん、一緒にお水を一杯飲みましょうか。`,
      `${n}さん、一緒にゆっくり深呼吸しましょう。`,
    ],
  },
};

export function phrasesFor(locale: string): Phrases {
  return P[langKey(locale)];
}
