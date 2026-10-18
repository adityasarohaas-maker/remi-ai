const EN = {
  greeting: { morning: 'Good morning', afternoon: 'Good afternoon', evening: 'Good evening', night: 'Hello' },
  talk: 'Talk to me', who: 'Who is this?', day: 'My day', help: 'I need help', helpSending: 'Telling your family…',
  back: 'Back', done: 'Done', tapSpeak: 'Tap and speak', listening: 'Listening…', thinking: 'Thinking…',
  typeHere: 'Type what you want to say', send: 'Send', youSaid: 'You said', choosePhoto: 'Choose a photo', looking: 'Looking…',
  retry: "Let's try that again in a moment.",
  state: { upcoming: 'Later', due: 'Now', done: 'Done ✓', missed: 'Not yet' },
  nothingToday: 'Nothing planned for today.',
};

type Labels = typeof EN;

const HI: Labels = {
  greeting: { morning: 'सुप्रभात', afternoon: 'नमस्ते', evening: 'शुभ संध्या', night: 'नमस्ते' },
  talk: 'मुझसे बात करें', who: 'ये कौन हैं?', day: 'मेरा दिन', help: 'मुझे मदद चाहिए', helpSending: 'परिवार को बता रहे हैं…',
  back: 'वापस', done: 'हो गया', tapSpeak: 'छूकर बोलिए', listening: 'सुन रहे हैं…', thinking: 'सोच रहे हैं…',
  typeHere: 'जो कहना है लिखिए', send: 'भेजें', youSaid: 'आपने कहा', choosePhoto: 'फ़ोटो चुनें', looking: 'देख रहे हैं…',
  retry: 'थोड़ी देर में फिर कोशिश करते हैं।',
  state: { upcoming: 'बाद में', due: 'अभी', done: 'हो गया ✓', missed: 'अभी नहीं हुआ' },
  nothingToday: 'आज के लिए कुछ तय नहीं है।',
};

export function labelsFor(language: string): Labels {
  return language.toLowerCase().startsWith('hi') ? HI : EN;
}
export type { Labels };
