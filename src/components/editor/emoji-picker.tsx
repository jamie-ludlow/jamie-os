'use client';

import { useState, useRef, useEffect } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';

const EMOJI_DATA: { emoji: string; keywords: string[] }[] = [
  // Smileys
  { emoji: '😀', keywords: ['smile','happy','grin'] },
  { emoji: '😃', keywords: ['smile','happy','open'] },
  { emoji: '😄', keywords: ['smile','happy','laugh'] },
  { emoji: '😁', keywords: ['grin','happy'] },
  { emoji: '😆', keywords: ['laugh','happy','lol'] },
  { emoji: '😅', keywords: ['sweat','nervous','laugh'] },
  { emoji: '🤣', keywords: ['rofl','laugh','lol','funny'] },
  { emoji: '😂', keywords: ['cry','laugh','lol','funny','tears'] },
  { emoji: '🙂', keywords: ['smile','slight'] },
  { emoji: '😊', keywords: ['blush','smile','happy'] },
  { emoji: '😇', keywords: ['angel','innocent','halo'] },
  { emoji: '🥰', keywords: ['love','hearts','adore'] },
  { emoji: '😍', keywords: ['love','heart','eyes'] },
  { emoji: '🤩', keywords: ['star','eyes','excited','wow'] },
  { emoji: '😘', keywords: ['kiss','love','blow'] },
  { emoji: '😋', keywords: ['yummy','delicious','tongue'] },
  { emoji: '😛', keywords: ['tongue','playful'] },
  { emoji: '😜', keywords: ['wink','tongue','crazy'] },
  { emoji: '🤪', keywords: ['crazy','zany','wild'] },
  { emoji: '🤔', keywords: ['think','thinking','hmm'] },
  { emoji: '🤫', keywords: ['quiet','shh','secret'] },
  { emoji: '🤭', keywords: ['oops','giggle'] },
  { emoji: '😏', keywords: ['smirk','sly'] },
  { emoji: '😒', keywords: ['unamused','meh'] },
  { emoji: '🙄', keywords: ['eye','roll','whatever'] },
  { emoji: '😬', keywords: ['grimace','awkward','yikes'] },
  { emoji: '😌', keywords: ['relieved','calm','zen'] },
  { emoji: '😴', keywords: ['sleep','zzz','tired'] },
  { emoji: '🤯', keywords: ['mind','blown','explode','wow'] },
  { emoji: '🤠', keywords: ['cowboy','yeehaw'] },
  { emoji: '🥳', keywords: ['party','celebrate','birthday'] },
  { emoji: '😎', keywords: ['cool','sunglasses'] },
  { emoji: '🤓', keywords: ['nerd','glasses','geek'] },
  { emoji: '😤', keywords: ['angry','frustrated','steam'] },
  { emoji: '😡', keywords: ['angry','mad','rage'] },
  { emoji: '🤬', keywords: ['swear','angry','curse'] },
  { emoji: '😈', keywords: ['devil','evil','naughty'] },
  { emoji: '💀', keywords: ['skull','dead','death','lol'] },
  { emoji: '👻', keywords: ['ghost','boo','casper'] },
  // Gestures
  { emoji: '👍', keywords: ['thumbs','up','yes','good','ok','approve'] },
  { emoji: '👎', keywords: ['thumbs','down','no','bad','disapprove'] },
  { emoji: '👊', keywords: ['fist','bump','punch'] },
  { emoji: '✊', keywords: ['fist','power','solidarity'] },
  { emoji: '👏', keywords: ['clap','applause','bravo'] },
  { emoji: '🙌', keywords: ['hands','raise','hooray','celebrate'] },
  { emoji: '🤝', keywords: ['handshake','deal','agree'] },
  { emoji: '🙏', keywords: ['pray','please','thanks','hope'] },
  { emoji: '✌️', keywords: ['peace','victory','two'] },
  { emoji: '🤞', keywords: ['crossed','fingers','luck','hope'] },
  { emoji: '🤘', keywords: ['rock','metal','horns'] },
  { emoji: '👌', keywords: ['ok','perfect','fine'] },
  { emoji: '👋', keywords: ['wave','hello','bye','hi'] },
  { emoji: '💪', keywords: ['strong','muscle','flex','power'] },
  { emoji: '🫶', keywords: ['heart','hands','love'] },
  // Hearts & feelings
  { emoji: '❤️', keywords: ['heart','love','red'] },
  { emoji: '🧡', keywords: ['heart','orange'] },
  { emoji: '💛', keywords: ['heart','yellow'] },
  { emoji: '💚', keywords: ['heart','green'] },
  { emoji: '💙', keywords: ['heart','blue'] },
  { emoji: '💜', keywords: ['heart','purple'] },
  { emoji: '🖤', keywords: ['heart','black'] },
  { emoji: '🤍', keywords: ['heart','white'] },
  { emoji: '💔', keywords: ['heart','broken','sad'] },
  { emoji: '💕', keywords: ['hearts','love'] },
  { emoji: '💯', keywords: ['hundred','perfect','score'] },
  // Objects & symbols
  { emoji: '⭐', keywords: ['star','favorite'] },
  { emoji: '🌟', keywords: ['star','glow','shine'] },
  { emoji: '✨', keywords: ['sparkle','magic','new'] },
  { emoji: '⚡', keywords: ['lightning','fast','electric','zap'] },
  { emoji: '🔥', keywords: ['fire','hot','lit'] },
  { emoji: '🎯', keywords: ['target','bullseye','goal'] },
  { emoji: '🎉', keywords: ['party','celebrate','tada'] },
  { emoji: '🎊', keywords: ['confetti','celebrate'] },
  { emoji: '🏆', keywords: ['trophy','winner','champion'] },
  { emoji: '🥇', keywords: ['gold','medal','first','winner'] },
  { emoji: '🚀', keywords: ['rocket','launch','fast','ship'] },
  { emoji: '💎', keywords: ['diamond','gem','jewel'] },
  { emoji: '💡', keywords: ['idea','lightbulb','tip'] },
  { emoji: '🔔', keywords: ['bell','notification','alert'] },
  { emoji: '📌', keywords: ['pin','important','note'] },
  { emoji: '📎', keywords: ['paperclip','attach'] },
  { emoji: '💰', keywords: ['money','bag','rich'] },
  { emoji: '📊', keywords: ['chart','data','stats','graph'] },
  { emoji: '📈', keywords: ['chart','up','growth','increase'] },
  { emoji: '📉', keywords: ['chart','down','decline','decrease'] },
  { emoji: '✅', keywords: ['check','done','complete','yes'] },
  { emoji: '❌', keywords: ['cross','no','wrong','delete'] },
  { emoji: '⚠️', keywords: ['warning','alert','caution'] },
  { emoji: '💬', keywords: ['speech','bubble','chat','message'] },
  { emoji: '🗣️', keywords: ['speak','talk','voice'] },
  { emoji: '👀', keywords: ['eyes','look','see','watch'] },
  { emoji: '🔑', keywords: ['key','important','access'] },
  { emoji: '⏰', keywords: ['alarm','clock','time','deadline'] },
  { emoji: '📅', keywords: ['calendar','date','schedule'] },
  { emoji: '🏃', keywords: ['run','running','fast','exercise'] },
  // Flags
  { emoji: '🏁', keywords: ['flag','finish','race'] },
  { emoji: '🚩', keywords: ['flag','red','warning'] },
  { emoji: '🇬🇧', keywords: ['uk','britain','england','flag'] },
  { emoji: '🇺🇸', keywords: ['us','usa','america','flag'] },
];

const CATEGORIES = [
  { name: 'Smileys', icon: '😀', range: [0, 39] },
  { name: 'Gestures', icon: '👍', range: [39, 55] },
  { name: 'Hearts', icon: '❤️', range: [55, 70] },
  { name: 'Objects', icon: '⭐', range: [70, 96] },
  { name: 'Flags', icon: '🏁', range: [96, 99] },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function CompactEmojiPicker({ onSelect }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const searchResults = search.trim()
    ? EMOJI_DATA.filter(e => e.keywords.some(k => k.includes(search.toLowerCase())))
    : null;

  const displayEmojis = searchResults 
    ? searchResults.map(e => e.emoji)
    : EMOJI_DATA.slice(CATEGORIES[activeCategory].range[0], CATEGORIES[activeCategory].range[1]).map(e => e.emoji);

  return (
    <div className="w-[240px] bg-popover border border-border/20 rounded-lg shadow-xl overflow-hidden">
      {/* Search */}
      <div className="p-2 border-b border-border/20">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji..."
          className="w-full px-2.5 py-1.5 text-[12px] bg-muted/40 border border-border/20 rounded-md outline-none text-foreground placeholder:text-muted-foreground/60 focus:border-primary/30"
        />
      </div>

      {/* Category tabs — hide when searching */}
      {!search && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border/20">
          {CATEGORIES.map((cat, i) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(i)}
              className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                activeCategory === i 
                  ? 'bg-primary/15 text-primary' 
                  : 'text-muted-foreground/30 hover:text-muted-foreground'
              }`}
            >
              <Tooltip>
                <TooltipTrigger asChild><span>{cat.icon}</span></TooltipTrigger>
                <TooltipContent side="bottom" className="text-[11px]">{cat.name}</TooltipContent>
              </Tooltip>
            </button>
          ))}
        </div>
      )}

      {/* Emojis grid */}
      <div className="p-1.5 max-h-[180px] overflow-y-auto">
        {!search && (
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground/30 font-medium px-1 mb-1">
            {CATEGORIES[activeCategory].name}
          </div>
        )}
        {search && searchResults?.length === 0 && (
          <div className="py-4 text-center text-[11px] text-muted-foreground/30">No emojis found</div>
        )}
        <div className="grid grid-cols-8 gap-0">
          {displayEmojis.map((emoji, i) => (
            <button
              key={i}
              onClick={() => onSelect(emoji)}
              className="w-7 h-7 flex items-center justify-center text-[16px] rounded hover:bg-muted/60 transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
