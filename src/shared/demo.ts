import type { ChatApiResponse, Language, RiskLevel, ToolId } from './types.ts';

type Category =
  | 'relationship'
  | 'anger'
  | 'avoidance'
  | 'anxiety'
  | 'low'
  | 'generic';

type DemoReply = {
  message: string;
  challenge: string;
  suggestedTool: ToolId;
};

type ReplySet = Record<Category | 'crisis' | 'elevated', DemoReply>;

const REPLIES: Record<Language, ReplySet> = {
  ceb: {
    crisis: {
      message:
        'Una sa tanan: salamat sa pagsulti nako. Dili nako ni laktawan. Kung naa kay plano o karon mismo gusto nimo pasakitan ang imong kaugalingon, palihog tawag sa **911** o sa **NCMH 1553** karon. Pwede ka ba makahimo og usa ka butang para nako? Ibutang sa layo ang bisan unsang butang nga pwede nimong gamiton sa pagpasakit sa imong kaugalingon, ug ingna ko: naa ka ba sa usa ka luwas nga lugar karon?\n\nDili ko moingon nga "okay ra na" kay dili na tinuod. Apan dili ka kailangan mag-inusara niini nga gutlo. Kung naa kay kasaligan nga tawo, i-text o tawga sila karon. Ako naa ra dinhi samtang nagsulti ta, apan ang tawhanon nga tabang mas importante karon.',
      challenge:
        'Ang imong sakit tinuod. Apan ang desisyon nga tapuson ang tanan dili tumong—senyales kini nga kinahanglan nimo og tabang karon.',
      suggestedTool: 'safety-plan',
    },
    elevated: {
      message:
        'Ganahan ko nga nisulti ka. Dili nako daan-daanon ang imong gibati. Apan kinahanglan nako pangutan-on ka og direkta: karon ba, nagahunahuna ka og pagpasakit sa imong kaugalingon o pagtapos sa imong kinabuhi?\n\nKung oo, palihog tawag sa **1553** o **911** karon, o tawga ang usa ka tawo nga makaanha nimo. Kung dili pa, atong himoon kini nga luwas: unsa ang pinakalisod nga bahin karon, ug kinsa ang pwede nimo maistorya nga dili lang moingon og "positive lang"?\n\nDili ko mopromise nga masulbad nako ang tanan. Apan dili ko mobalibad sa imong tinuod nga gibati.',
      challenge:
        'Ang pag-ingon nga "wala nay paglaum" dili kamatuoran—istorya kini sa kakapoy. Ayaw itugot nga mahimong desisyon.',
      suggestedTool: 'safety-plan',
    },
    anger: {
      message:
        'Kasabot ko nga init kaayo imong ulo—ug may rason ka. Pero tan-awa: ang pagpamalikas o pag-away karon mura ka og gasa sa kalayo. Makapalipay sa makadiyot, pero ikaw ang masunog ugma.\n\nAyaw ko ingna nga "deserve niya." Ang tinuod nga pangutana: unsa may gusto nimo mahitabo pagkahuman? Respeto? Kalinaw? Boundary? Ang kasuko senyales nga naa kay importante nga gipangita—pero dili maayo nga driver. Hunong sa 90 ka segundo. Unya isulti kanako: unsa ang pinakagamay nga lakang nga dili nimo pagbasulan ugma?',
      challenge:
        'Ang kasuko dili sayop. Ang pagtugot niini nga modesisyon para nimo maoy kuyaw.',
      suggestedTool: 'anger-pause',
    },
    avoidance: {
      message:
        'Diretsohon tika: kadtong "ugma na lang" dili na pagpahulay—paglikay na. Ug kahibalo ka ana. Ang kakulba nga imong gibati tungod kay wala nimo gibuhat dili mawala pinaagi sa pag-scroll.\n\nDili nako ka ingnon nga "kaya nimo" lang. Kaya nimo kung mubuhat ka sa pinakagamay nga butang karon: 10 minutos, walay phone, usa ka pahina, usa ka email. Pagkahuman, istorya ta.\n\nUnsa ang pinakagamay nga lakang nga pwede nimo buhaton sulod sa sunod 10 minuto—ug unsa ang mopugong nimo?',
      challenge:
        'Dili kakulang sa abilidad ang problema karon. Kakulang sa pagdesisyon ug paglihok.',
      suggestedTool: 'thought-record',
    },
    relationship: {
      message:
        'Nasakitan ka—klaro na. Pero ayaw ta pagtago sa "siya ra ang sayop" nga istorya. Unsa man ang imong bahin nga wala nimo gisulti? Unsa ang imong gibuhat nga nagpalala sa sitwasyon?\n\nAng tinuod nga higala dili moingon nga "ihatag lang nimo tanan" o "biya-i dayon." Pangutan-on ka: unsa ang imong boundary, ug unsa ka andam mo-stand niini? Kung gusto nimo, isulat nato ang usa ka klaro nga mensahe—walay pagbasol, walay pagpangita og away.\n\nUnsa ang gusto nimo nga mahibaw-an niya?',
      challenge:
        'Ang pagpasaylo nga walay boundary dili kalipay—pagpapadayon sa samang sakit.',
      suggestedTool: 'thought-record',
    },
    anxiety: {
      message:
        'Ang kahadlok moingon nga sigurado na ang labing grabe nga mahitabo. Dili na tinuod—apan tinuod ang reaksyon sa imong lawas. Hunong sa pagtuo nga ang "what if" sama sa "what is."\n\nKuhaa ang papel. Isulat: unsa ang nahitabo, unsa ang giingon sa imong hunahuna, ug unsa ang ebidensya nga kontra niana. Dili nako ka ingnon nga "ayaw kabalaka"—walay gamit na. Ang gusto nako: makita nimo ang kalainan tali sa peligro ug sa imong hunahuna nga peligro.\n\nUnsa ang usa ka butang nga kontrolado nimo karon?',
      challenge:
        'Ang paglikay makapahupay kadiyot, pero makapadako sa kahadlok sa sunod.',
      suggestedTool: 'grounding',
    },
    low: {
      message:
        'Gikapoy ka—ug dili ko moingon nga "positive lang." Ang kakapoy nga imong gibati karon tinuod, ug dili nimo kinahanglan i-explain tanan para hatagan og bili.\n\nApan isulti ko ni: ang kaguol moingon og "wala nay paglaum"; ang kamatuoran mas gamay pa ana. Karon, dili nato sulbaron ang tibuok kinabuhi. Usa lang ka butang: tubig, 5 minutos nga ginhawa, o pag-text sa usa ka tawo.\n\nUnsa ang pinakagamay nga butang nga makahimo nimo nga 1% mas maayo karon—dili ugma?',
      challenge:
        'Ang paghuna-huna nga "wala nay paglaum" dili kamatuoran—istorya kini sa kakapoy.',
      suggestedTool: 'breathing',
    },
    generic: {
      message:
        'Salamat sa pagsalig. Dili nako sayon-sayonon ang imong gibati. Pero dili pud ko moingon nga "tama ka sa tanan"—kay dili na tabang, pag-uyon lang na.\n\nAtong buhaton: unsa ang tinuod nga nahitabo, ug unsa ang istorya nga imong gidugang niini? Kanunay naay kalainan. Ang tinuod nga higala moingon: "Naminaw ko. Apan tan-awa sad kini."\n\nUnsa ang gusto nimo nga matabang nako karon—pagpaminaw, pag-challenge sa imong hunahuna, o usa ka gamay nga plano?',
      challenge:
        'Dili tanang gibati nimo kamatuoran—apan tanang gibati nimo angay pamation.',
      suggestedTool: 'thought-record',
    },
  },
  fil: {
    crisis: {
      message:
        'Una sa lahat: salamat sa pagsasabi sa akin. Hindi ko ito lalampasan. Kung may plano ka o gusto mong saktan ang sarili mo ngayon, tumawag agad sa **911** o sa **NCMH 1553**. Pwede mo bang gawin ito para sa akin? Ilayo ang kahit anong bagay na pwede mong gamitin para saktan ang sarili mo, at sabihin sa akin: ligtas ka ba ngayon?\n\nHindi ko sasabihing "okay lang yan" dahil hindi totoo yun. Pero hindi ka kailangang mag-isa sa sandaling ito. Kung may mapagkakatiwalaan kang tao, i-text o tawagan mo sila ngayon. Nandito ako habang nag-uusap tayo, pero mas kailangan mo ang tulong ng tao ngayon.',
      challenge:
        'Totoo ang sakit mo. Pero ang desisyong tapusin ang lahat ay hindi solusyon—senyales ito na kailangan mo ng tulong ngayon.',
      suggestedTool: 'safety-plan',
    },
    elevated: {
      message:
        'Salamat sa pagsasabi sa akin. Hindi ko gagawing maliit ang nararamdaman mo. Pero kailangan kong itanong nang direkta: ngayon ba, iniisip mo bang saktan ang sarili mo o tapusin ang buhay mo?\n\nKung oo, tumawag agad sa **1553** o **911**, o tawagan ang isang taong pwedeng pumunta sa tabi mo. Kung hindi pa, gawin nating ligtas ito: ano ang pinakamahirap na bahagi ngayon, at sino ang pwedeng mong kausapin na hindi lang magsasabing "positive lang"?\n\nHindi ko ipinapangakong maayos ko ang lahat. Pero hindi ko tatanggihan ang totoo mong nararamdaman.',
      challenge:
        'Ang "wala nang pag-asa" ay hindi katotohanan—storya ito ng pagod. Huwag mong hayaang maging desisyon.',
      suggestedTool: 'safety-plan',
    },
    anger: {
      message:
        'Naiintindihan ko na sobrang init ng ulo mo—at may dahilan ka. Pero tingnan mo: ang pagsigaw o pakikipag-away ngayon ay parang gasolina sa apoy. Masaya sandali, pero ikaw ang masusunog bukas.\n\nHuwag mong sabihing "deserve niya." Ang tunay na tanong: ano ang gusto mong mangyari pagkatapos? Respeto? Kapayapaan? Boundary? Ang galit ay senyales na may mahalaga kang hinahanap—pero hindi ito magandang driver. Huminto muna ng 90 segundo. Pagkatapos, sabihin sa akin: ano ang pinakamaliit na hakbang na hindi mo pagsisisihan bukas?',
      challenge:
        'Hindi mali ang magalit. Ang hayaang magdesisyon ito para sa iyo ang delikado.',
      suggestedTool: 'anger-pause',
    },
    avoidance: {
      message:
        'Diretsuhin kita: ang "bukas na lang" ay hindi na pahinga—pag-iwas na ito. At alam mo yun. Ang kaba na nararamdaman mo dahil hindi mo pa nagagawa ay hindi mawawala sa pag-scroll.\n\nHindi ko sasabihing "kaya mo" lang. Kaya mo kung gagawin mo ang pinakamaliit na bagay ngayon: 10 minuto, walang phone, isang pahina, isang email. Pagkatapos, mag-usap tayo.\n\nAno ang pinakamaliit na hakbang na kaya mong gawin sa susunod na 10 minuto—at ano ang pumipigil sa iyo?',
      challenge:
        'Hindi kakulangan sa abilidad ang problema ngayon. Kakulangan sa desisyon at paggalaw.',
      suggestedTool: 'thought-record',
    },
    relationship: {
      message:
        'Nasasaktan ka—malinaw yun. Pero huwag tayong magtago sa "siya lang ang mali" na kwento. Ano ang bahagi mo na hindi mo sinasabi? Ano ang ginawa mo na nagpalala sa sitwasyon?\n\nAng tunay na kaibigan hindi magsasabing "ibigay mo na lang lahat" o "iwan mo agad." Itatanong niya: ano ang boundary mo, at gaano ka kahanda na panindigan ito? Kung gusto mo, isulat natin ang isang malinaw na mensahe—walang paninisi, walang paghahanap ng away.\n\nAno ang gusto mong malaman niya?',
      challenge:
        'Ang pagpapatawad na walang boundary ay hindi kapayapaan—pagpapatuloy ito ng parehong sakit.',
      suggestedTool: 'thought-record',
    },
    anxiety: {
      message:
        'Sinasabi ng takot na sigurado na ang pinakamasamang mangyayari. Hindi yun totoo—pero totoo ang reaksyon ng katawan mo. Itigil natin ang pagturing sa "what if" na parang "what is."\n\nKumuha ka ng papel. Isulat: ano ang nangyari, ano ang sinasabi ng isip mo, at ano ang ebidensyang kontra dito. Hindi ko sasabihing "huwag kang mag-alala"—walang gamit yun. Ang gusto ko: makita mo ang pagkakaiba ng panganib at ng panganib sa isip mo.\n\nAno ang isang bagay na kontrolado mo ngayon?',
      challenge:
        'Ang pag-iwas ay nakakagaan sandali, pero pinapalaki nito ang takot sa susunod.',
      suggestedTool: 'grounding',
    },
    low: {
      message:
        'Pagod ka—at hindi ko sasabihing "positive lang." Totoo ang pagod na nararamdaman mo, at hindi mo kailangang ipaliwanag lahat para bigyan ito ng halaga.\n\nPero sasabihin ko ito: sinasabi ng lungkot na "wala nang pag-asa"; mas maliit pa sa totoo ang tunay na larawan. Ngayon, hindi natin aayusin ang buong buhay. Isang bagay lang: tubig, 5 minutong paghinga, o pag-text sa isang tao.\n\nAno ang pinakamaliit na bagay na makakagaan sa iyo ng 1% ngayon—hindi bukas?',
      challenge:
        'Ang "wala nang pag-asa" ay hindi katotohanan—storya ito ng pagod.',
      suggestedTool: 'breathing',
    },
    generic: {
      message:
        'Salamat sa pagtitiwala. Hindi ko gagawing maliit ang nararamdaman mo. Pero hindi rin ako magsasabing "tama ka sa lahat"—hindi yun tulong, pagsang-ayon lang yun.\n\nGawin natin ito: ano ang totoong nangyari, at ano ang kwentong idinagdag mo dito? Laging may pagkakaiba. Ang tunay na kaibigan magsasabi: "Nakinig ako. Pero tingnan din natin ito."\n\nAno ang gusto mong maitulong ko ngayon—makinig, hamunin ang isip mo, o gumawa ng maliit na plano?',
      challenge:
        'Hindi lahat ng nararamdaman mo ay katotohanan—pero lahat ng nararamdaman mo ay dapat pakinggan.',
      suggestedTool: 'thought-record',
    },
  },
  en: {
    crisis: {
      message:
        'First: thank you for telling me. I am not going to skip past this. If you have a plan or you want to hurt yourself right now, please call **911** or the **NCMH crisis line at 1553** now. Can you do one thing for me? Put any means of hurting yourself out of reach, and tell me: are you in a safe place right now?\n\nI will not tell you "it will be okay" because that would be dishonest. But you do not have to carry this moment alone. If there is someone you trust, message or call them now. I am here while we talk, but a human being is what you need most right now.',
      challenge:
        'Your pain is real. But ending everything is not a destination—it is a signal that you need help right now.',
      suggestedTool: 'safety-plan',
    },
    elevated: {
      message:
        'Thank you for telling me. I am not going to minimise what you are feeling. But I need to ask you directly: right now, are you thinking about hurting yourself or ending your life?\n\nIf yes, please call **1553** or **911** now, or call someone who can be with you. If not, let us make this moment safer: what is the hardest part right now, and who could you talk to who will not just tell you to "stay positive"?\n\nI will not promise to fix everything. But I will not turn away from what is true for you.',
      challenge:
        '"There is no hope" is not a fact—it is a story that exhaustion tells. Do not let it make a decision for you.',
      suggestedTool: 'safety-plan',
    },
    anger: {
      message:
        'I get it—your blood is hot, and you have a reason. But look: lashing out right now is like pouring petrol on a fire. It feels good for a second, then you are the one who gets burned tomorrow.\n\nDo not tell me "he deserved it." The real question is: what do you want to be true afterwards? Respect? Peace? A boundary? Anger is a signal that something important is being threatened—but it is a terrible driver. Pause for 90 seconds. Then tell me: what is the smallest move you will not regret tomorrow?',
      challenge:
        'Anger is not wrong. Letting it choose your next move is.',
      suggestedTool: 'anger-pause',
    },
    avoidance: {
      message:
        'I will be straight with you: "I will do it tomorrow" is not rest anymore—it is avoidance. And you know it. The anxiety you feel about not starting does not disappear through scrolling.\n\nI am not going to tell you "you got this" and leave it there. You get this by doing the smallest real thing now: 10 minutes, phone away, one page, one email. Then we talk.\n\nWhat is the smallest step you can take in the next 10 minutes—and what is actually stopping you?',
      challenge:
        'This is not a lack of ability. It is a lack of decision and movement.',
      suggestedTool: 'thought-record',
    },
    relationship: {
      message:
        'You are hurt—that part is clear. But let us not hide inside the story that "they are the only problem." What is your part that you have not said out loud? What did you do that made this harder?\n\nA real friend will not tell you to "just give everything" or "leave immediately." They will ask: what is your boundary, and are you willing to stand behind it? If you want, we can write one clear message—no blame, no picking a fight.\n\nWhat do you need them to understand?',
      challenge:
        'Forgiveness without a boundary is not peace—it is the same wound on repeat.',
      suggestedTool: 'thought-record',
    },
    anxiety: {
      message:
        'Fear says the worst outcome is certain. It is not—but your body\'s reaction is real. Let us stop treating "what if" like "what is."\n\nGet a piece of paper. Write down what happened, what your mind is saying, and the evidence against it. I will not tell you "don\'t worry"—that is useless. I want you to see the difference between danger and the danger your mind is predicting.\n\nWhat is one thing you can control right now?',
      challenge:
        'Avoidance gives you relief for a moment, then makes the fear bigger next time.',
      suggestedTool: 'grounding',
    },
    low: {
      message:
        'You are tired—and I will not tell you to "just stay positive." The exhaustion you feel is real, and you do not have to explain all of it to deserve care.\n\nBut hear this: sadness says "there is no hope"; the full truth is smaller than that. We are not going to solve your whole life right now. One thing: water, five minutes of breathing, or texting one person.\n\nWhat is the smallest thing that could make you 1% better today—not tomorrow?',
      challenge:
        '"There is no hope" is not a fact—it is a story that exhaustion tells.',
      suggestedTool: 'breathing',
    },
    generic: {
      message:
        'Thank you for trusting me with this. I will not make light of what you are feeling. But I will also not tell you "you are completely right"—that is not help, that is just agreement.\n\nLet us do this: what actually happened, and what story did you add to it? There is always a gap. A real friend says, "I hear you. Now look at this with me."\n\nWhat would help most right now—being heard, having the thought challenged, or making one small plan?',
      challenge:
        'Not every feeling is a fact—but every feeling deserves to be heard.',
      suggestedTool: 'thought-record',
    },
  },
};

const CATEGORY_PATTERNS: Array<{ category: Category; pattern: RegExp }> = [
  {
    category: 'relationship',
    pattern:
      /\b(uyab|ex|partner|asawa|bana|relasyon|relationship|girlfriend|boyfriend|gf|bf|break\s?up|bulag|hiwalay|cheat|giselosan|seloso|selosa|selos|jealous)\b/i,
  },
  {
    category: 'anger',
    pattern:
      /\b(gisapot|nasapot|sapot|gisuko|nasuko|kasuko|kalagot|lagot|galit|inis|yawa|away|argue|fight|rage|anger|furious|gigil|maldita|bastos)\b/i,
  },
  {
    category: 'avoidance',
    pattern:
      /\b(procrastin\w*|tapulan|tambay|later|ugma|bukas|thesis|exam|tuon|study|deadline|trabaho|work|school|eskwela|assignment|start)\b/i,
  },
  {
    category: 'anxiety',
    pattern:
      /\b(gikulbaan|nakulbaan|nerbiyos|kabalaka|anxiety|panic|hadlok|takot|overthink\w*|what\s?if|worry|kulba|nerbyos)\b/i,
  },
  {
    category: 'low',
    pattern:
      /\b(gikapoy|kapoy|tired|sad|naguol|lungkot|malungkot|depress\w*|empty|alone|usa\s+ra|mag-isa|lonely|burnout|exhausted)\b/i,
  },
];

function detectCategory(text: string): Category {
  for (const { category, pattern } of CATEGORY_PATTERNS) {
    if (pattern.test(text)) return category;
  }
  return 'generic';
}

export function buildDemoReply(input: {
  text: string;
  language: Language;
  riskLevel: RiskLevel;
}): ChatApiResponse {
  const { text, language, riskLevel } = input;

  let reply: DemoReply;
  if (riskLevel === 'crisis') {
    reply = REPLIES[language].crisis;
  } else if (riskLevel === 'elevated') {
    reply = REPLIES[language].elevated;
  } else {
    reply = REPLIES[language][detectCategory(text)];
  }

  return {
    message: reply.message,
    challenge: reply.challenge,
    suggestedTool: reply.suggestedTool,
    riskLevel,
    demo: true,
  };
}
