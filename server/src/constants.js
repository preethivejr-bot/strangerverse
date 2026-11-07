export const ROLES = {
  OWNER: 'OWNER', // Level 1: Original Owner / Super Manager
  MANAGER: 'MANAGER', // Level 2: Appointed Manager
  MODERATOR: 'MODERATOR', // Level 3: Appointed or Auto-promoted Moderator
  NORMAL_USER: 'NORMAL_USER', // Level 4: Default for all users
};

export const ROLE_HIERARCHY = {
  OWNER: 1,
  MANAGER: 2,
  MODERATOR: 3,
  NORMAL_USER: 4,
};

export const TAMIL_NADU_DISTRICTS = [
  {
    id: 'chennai',
    name: 'Chennai',
    tagline: 'Gateway of South India • Marina & Tech Corridor',
    description: 'The vibrant capital of Tamil Nadu, home to the world’s second longest urban beach, historic Fort St. George, and thriving tech hubs.',
    accentColor: '#3B82F6',
    landmark: 'Marina Lighthouse & Central Station',
    maxCapacity: 10,
    tags: ['Tech Hub', 'Marina', 'Kollywood'],
    icon: 'Landmark'
  },
  {
    id: 'vellore',
    name: 'Vellore',
    tagline: 'Fort City & Medical Capital',
    description: 'Famed for its imposing 16th-century granite fort surrounded by a moat, world-renowned CMC medical institution, and Sripuram Golden Temple.',
    accentColor: '#8B5CF6',
    landmark: 'Vellore Fort & Sripuram Golden Temple',
    maxCapacity: 10,
    tags: ['Fort City', 'Heritage', 'CMC'],
    icon: 'Castle'
  },
  {
    id: 'tiruchirappalli',
    name: 'Tiruchirappalli',
    tagline: 'Rockfort & Cauvery Heartland',
    description: 'An ancient city resting on the banks of the sacred Cauvery River, crowned by the majestic 83-meter high Rockfort Temple and Srirangam.',
    accentColor: '#06B6D4',
    landmark: 'Rockfort Uchchi Pillayar & Srirangam Ranganathaswamy',
    maxCapacity: 10,
    tags: ['Rockfort', 'Cauvery', 'Srirangam'],
    icon: 'Mountain'
  },
  {
    id: 'madurai',
    name: 'Madurai',
    tagline: 'Thoonga Nagaram • City that Never Sleeps',
    description: 'One of the oldest continuously inhabited cities on earth, renowned for the glorious Meenakshi Amman Temple, jasmine blossoms, and jigarthanda.',
    accentColor: '#EC4899',
    landmark: 'Meenakshi Amman Temple & Thirumalai Nayakkar Palace',
    maxCapacity: 10,
    tags: ['Meenakshi Amman', 'Jasmine', 'Food Capital'],
    icon: 'Sparkles'
  },
  {
    id: 'kanniyakumari',
    name: 'Kanniyakumari',
    tagline: 'Cape Comorin • Confluence of Three Oceans',
    description: 'The southern tip of mainland India where the Bay of Bengal, Arabian Sea, and Indian Ocean merge, famous for breathtaking sunrises and sunsets.',
    accentColor: '#10B981',
    landmark: 'Thiruvalluvar Statue & Vivekananda Rock Memorial',
    maxCapacity: 10,
    tags: ['Tri-Sea', 'Thiruvalluvar', 'Sunrise'],
    icon: 'Compass'
  },
  {
    id: 'salem',
    name: 'Salem',
    tagline: 'Steel City & Mango Capital',
    description: 'Nestled between hills with picturesque Yercaud nearby, Salem is celebrated for its high-grade steel, rich mineral wealth, and sweet Malgoa mangoes.',
    accentColor: '#F59E0B',
    landmark: 'Yercaud Hills & Mettur Dam Reservoir',
    maxCapacity: 10,
    tags: ['Steel City', 'Mangoes', 'Yercaud'],
    icon: 'Shield'
  },
  {
    id: 'coimbatore',
    name: 'Coimbatore',
    tagline: 'Manchester of South India • Kovai Breeze',
    description: 'Flanked by the Western Ghats, Kovai is a hub of textile mills, motors, Siruvani sweet water, pleasant climate, and the iconic Adiyogi statue.',
    accentColor: '#6366F1',
    landmark: 'Siruvani Waterfalls & Adiyogi Shiva Statue',
    maxCapacity: 10,
    tags: ['Manchester of South', 'Siruvani', 'Adiyogi'],
    icon: 'CloudSun'
  },
  {
    id: 'erode',
    name: 'Erode',
    tagline: 'Turmeric City & Textile Loom Haven',
    description: 'Globally recognized for its vast turmeric spice markets, woven textile looms, and scenic Bhavani Kooduthurai river confluence.',
    accentColor: '#EAB308',
    landmark: 'Bhavani Sangameshwarar & Kodiveri Dam',
    maxCapacity: 10,
    tags: ['Turmeric City', 'Textiles', 'Bhavani'],
    icon: 'Layers'
  },
  {
    id: 'tirunelveli',
    name: 'Tirunelveli',
    tagline: 'Halwa City & Nellaiappar Pride',
    description: 'Traversed by the perennial Thamirabarani River, famed for melt-in-mouth Tirunelveli wheat halwa, Nellaiappar temple, and Courtallam cascades.',
    accentColor: '#14B8A6',
    landmark: 'Nellaiappar Temple & Thamirabarani Riverfront',
    maxCapacity: 10,
    tags: ['Halwa City', 'Thamirabarani', 'Courtallam'],
    icon: 'Flame'
  },
  {
    id: 'thanjavur',
    name: 'Thanjavur',
    tagline: 'Rice Bowl of Tamil Nadu & Chola Splendor',
    description: 'The cradle of classical Carnatic music, bronze sculptures, Thanjavur art plates, and the world-heritage Brihadisvara (Big) Temple built by Raja Raja Chola.',
    accentColor: '#F97316',
    landmark: 'Brihadisvara Big Temple & Saraswathi Mahal Library',
    maxCapacity: 10,
    tags: ['Big Temple', 'Chola Dynasty', 'Arts'],
    icon: 'Crown'
  }
];

export const AUTO_MODERATOR_THRESHOLD_MS = 10 * 60 * 1000; // 10 minutes standard
export const FAST_TEST_AUTO_MODERATOR_THRESHOLD_MS = 20 * 1000; // 20 seconds for dev/test mode toggle!
