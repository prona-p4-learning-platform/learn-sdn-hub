import type { Role, Avatar } from '../types';

export const roles: Role[] = [
  {
    id: 'socialiser',
    name: 'Socialiser',
    description: 'A charismatic ally who thrives in groups and loves to build connections. Strength lies in teamwork and bringing others together.',
  },
  {
    id: 'freespirit',
    name: 'Free Spirit',
    description: 'An adventurous explorer driven by curiosity and creativity. Always seeking new paths and hidden secrets.',
  },
  {
    id: 'achiever',
    name: 'Achiever',
    description: 'A determined challenger who sharpens their skills with every test. They live for quests and proving their mastery through hard-won victories.',
  },
  {
    id: 'philanthropist',
    name: 'Philanthropist',
    description: 'A noble guide who gives freely, offering wisdom and support, with the purpose to uplift others and ensures they thrive.',
  },
  {
    id: 'player',
    name: 'Player',
    description: 'A treasure hunter who knows how to maximize every reward. Quick to act where prizes await, they excel at collecting points and trophies.',
  },
  {
    id: 'disruptor',
    name: 'Disruptor',
    description: 'An innovator who shakes the system to its core, as they drive change and challenge the status quo.',
  }
];

export const avatars: Avatar[] = [
  {
    id: 'happy',
    name: 'Happy to be here',
    imageUrl: 'src/avatars/happy.png',
    description: 'No thoughts, just vibes.'
  },
  {
    id: 'impressed',
    name: 'WOOOOOOOOOOOOW',
    imageUrl: 'src/avatars/impressed.png',
    description: '10/10 would wow again.'
  },
  {
    id: 'cool',
    name: 'GG EZ',
    imageUrl: 'src/avatars/cool.png',
    description: 'Skill issue… but not mine.'
  },
  {
    id: 'angry',
    name: 'Ragequit',
    imageUrl: 'src/avatars/angry.png',
    description: 'WHY IS THIS SO HARD!?!?!?!'
  },
  {
    id: 'wise',
    name: 'Perfectly balanced',
    imageUrl: 'src/avatars/wise.png',
    description: 'As all things should be.'
  },
  {
    id: 'ambitious',
    name: 'I wanna be the very best',
    imageUrl: 'src/avatars/ambitious.png',
    description: 'Like no one ever was.'
  }
];
