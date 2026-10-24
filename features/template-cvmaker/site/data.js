export const initialCvData = {
  personalInfo: {
    fullName: "Jordan Reed",
    jobTitle: "Senior Cloud & DevOps Engineer",
    email: "jordan.reed@cloudscale.dev",
    phone: "+1 (555) 382-9104",
    location: "San Francisco, CA / Remote",
    website: "jordanreed.dev",
    linkedin: "linkedin.com/in/jordanreed-cloud",
    github: "github.com/jordanreed",
    photoUrl: ""
  },
  professionalSummary:
    "Results-driven Cloud & DevOps Engineer with 6+ years of experience designing automated CI/CD delivery pipelines, managing multi-region cloud infrastructure, and scaling high-availability microservices. Proven expertise in Terraform, Kubernetes, and configuration management across enterprise environments with zero-downtime releases.",
  workExperience: [
    {
      id: "exp-1",
      jobTitle: "DevOps & Infrastructure Engineer",
      company: "CloudScale Systems",
      location: "San Francisco, CA",
      startDate: "Apr 2023",
      endDate: "Present",
      current: true,
      highlights: [
        "CI/CD: Designed and optimized application delivery pipelines using GitLab CI/CD, reducing development and release deployment time by 35%.",
        "Infrastructure as Code (IaC): Managed and provisioned multi-environment infrastructure deployment using Terraform (modular approach, state management).",
        "Configuration Management: Automated server configuration and maintenance using Ansible across 30+ production nodes.",
        "Containerization: Containerized applications with Docker & Kubernetes, migrating legacy monolithic services to isolated container environments.",
        "Support and Maintenance: Ensured 99.99% dev/stage/prod stability, successfully troubleshot system alerts, and automated Linux server administration."
      ]
    }
  ],
  education: [
    {
      id: "edu-1",
      degree: "Bachelor of Science",
      field: "Computer Science",
      school: "State University of Technology",
      location: "San Francisco, CA",
      startDate: "Sep 2019",
      endDate: "Jun 2023",
      current: false,
      details: "B.Sc. in Computer Science - Focused on distributed systems and network architecture"
    }
  ],
  skills: [
    { id: "sk-1", name: "Infrastructure as Code", level: "Expert" },
    { id: "sk-2", name: "Continuous Integration", level: "Expert" },
    { id: "sk-3", name: "Containerization", level: "Advanced" },
    { id: "sk-4", name: "Version control", level: "Advanced" },
    { id: "sk-5", name: "Problem-solving", level: "Expert" }
  ],
  languages: [
    { id: "lang-1", name: "English", level: "Native" },
    { id: "lang-2", name: "Spanish", level: "Professional Working" }
  ],
  hobbies: "Marathon runner, open-source contributor, chess enthusiast",
  customSections: [
    {
      id: "cust-1",
      title: "Key Competencies",
      items: [
        "Project Roadmapping & Agile Sprint Coordination",
        "Cloud & On-prem Virtualization Architecture",
        "Stakeholder Communication & Technical Documentation"
      ]
    }
  ],
  designConfig: {
    templateId: "signature-teal", // signature-teal, executive-navy, minimalist-ats, modern-creative, nordic-clean, tech-lead, elegant-serif, compact-grid
    primaryColor: "#4392a8",
    secondaryColor: "#27363e",
    accentColor: "#337286",
    fontFamily: "Inter", // Inter, Merriweather, Outfit, Plus Jakarta Sans
    fontSize: "medium", // small, medium, large
    spacingDensity: "standard", // compact, standard, relaxed
    showPhoto: true,
    showIcons: true
  },
  coverLetter: {
    recipientName: "Hiring Team",
    recipientTitle: "Talent Acquisition Manager",
    companyName: "CloudScale Technologies",
    companyAddress: "San Francisco, CA",
    date: "October 9, 2026",
    subject: "Application for IT Infrastructure Project Coordinator",
    salutation: "Dear Hiring Team,",
    bodyParagraphs: [
      "I am writing to express my enthusiastic interest in the IT Infrastructure Project Coordinator position. With a solid foundation in DevOps automation, Linux systems administration, and hands-on infrastructure migrations, I bring a unique blend of technical expertise and cross-functional coordination ability to your engineering workflows.",
      "In my recent role at CloudScale Systems, I designed GitLab CI/CD pipelines that reduced delivery cycles by 35% and provisioned modular infrastructure using Terraform and Ansible. This hands-on experience allows me to communicate fluently with developers, system architects, and executive stakeholders, ensuring technical milestones are met on schedule without compromising infrastructure reliability.",
      "I am particularly drawn to your organization's commitment to scalable cloud initiatives. I am confident that my analytical problem-solving, dedication to Agile roadmapping, and disciplined work ethic will make an immediate positive impact on your project delivery pipelines.",
      "Thank you for your time and consideration. I welcome the opportunity to discuss how my technical background and coordination skills can support your upcoming infrastructure milestones."
    ],
    signOff: "Sincerely,",
    senderName: "Jordan Reed"
  },
  sectionConfig: {
    order: ['summary', 'experience', 'education', 'skills', 'languages', 'customSections', 'hobbies'],
    hidden: {
      summary: false,
      experience: false,
      education: false,
      skills: false,
      languages: false,
      customSections: false,
      hobbies: false
    }
  }
};

export const sampleSoftwareEngineerData = {
  personalInfo: {
    fullName: "Alex Morgan",
    jobTitle: "Senior Full-Stack Software Engineer",
    email: "alex.morgan@devcloud.io",
    phone: "+44 7911 123456",
    location: "London, UK (Remote)",
    website: "https://alexmorgan.dev",
    linkedin: "linkedin.com/in/alexmorgandev",
    github: "github.com/alexmorgan",
    photoUrl: ""
  },
  professionalSummary:
    "Product-focused Senior Software Engineer with 7+ years of experience engineering high-throughput distributed web applications and microservices. Expert in React, TypeScript, Node.js, and AWS serverless architectures. Track record of cutting p99 API latencies by 45% and leading cross-functional engineering pods from discovery to production deployment.",
  workExperience: [
    {
      id: "exp-se-1",
      jobTitle: "Lead Full-Stack Engineer",
      company: "CloudScale Technologies",
      location: "London, UK",
      startDate: "Jan 2023",
      endDate: "Present",
      current: true,
      highlights: [
        "Architected and shipped real-time collaboration engine using React, WebSockets, and Redis pub/sub serving 150K DAU.",
        "Refactored legacy monolith into Node.js/TypeScript microservices deployed on AWS ECS with zero downtime.",
        "Decreased frontend bundle load time by 52% through dynamic route code-splitting and asset pipeline optimization.",
        "Mentored team of 6 engineers, instituted strict code review benchmarks, and raised test coverage to 92%."
      ]
    },
    {
      id: "exp-se-2",
      jobTitle: "Senior Software Engineer",
      company: "FinFlow Systems",
      location: "Cambridge, UK",
      startDate: "May 2020",
      endDate: "Dec 2022",
      current: false,
      highlights: [
        "Engineered PCI-DSS compliant payment processing service processing £12M in monthly transaction volume.",
        "Designed GraphQL federation gateway unifying 8 backend data stores into a single strongly-typed schema.",
        "Implemented end-to-end telemetry and OpenTelemetry tracing in Datadog, cutting MTTR for incidents by 60%."
      ]
    }
  ],
  education: [
    {
      id: "edu-se-1",
      degree: "B.Sc. in Computer Science",
      field: "Software Systems & Security",
      school: "University of Edinburgh",
      location: "Edinburgh, UK",
      startDate: "Sep 2016",
      endDate: "Jun 2020",
      current: false,
      details: "First Class Honours • Dissertation on Distributed Consensus Protocols"
    }
  ],
  skills: [
    { id: "sk-se-1", name: "TypeScript & JavaScript", level: "Expert" },
    { id: "sk-se-2", name: "React & Next.js", level: "Expert" },
    { id: "sk-se-3", name: "Node.js & Express", level: "Expert" },
    { id: "sk-se-4", name: "PostgreSQL & Prisma", level: "Advanced" },
    { id: "sk-se-5", name: "AWS (ECS, Lambda, SQS)", level: "Advanced" },
    { id: "sk-se-6", name: "Docker & CI/CD", level: "Advanced" }
  ],
  languages: [
    { id: "lang-se-1", name: "English", level: "Native" },
    { id: "lang-se-2", name: "German", level: "B2 - Professional" }
  ],
  hobbies: "Open source maintainer, mechanical keyboards, hiking in the Highlands",
  customSections: [
    {
      id: "cust-se-1",
      title: "Key Certifications",
      items: [
        "AWS Certified Solutions Architect – Associate (2024)",
        "Kubernetes and Cloud Native Associate (KCNA)"
      ]
    }
  ],
  designConfig: {
    templateId: "tech-lead",
    primaryColor: "#0284c7",
    secondaryColor: "#0f172a",
    accentColor: "#38bdf8",
    fontFamily: "Plus Jakarta Sans",
    fontSize: "medium",
    spacingDensity: "standard",
    showPhoto: true,
    showIcons: true
  }
};

export const sampleProductManagerData = {
  personalInfo: {
    fullName: "Elena Rostova",
    jobTitle: "Senior Technical Product Manager",
    email: "elena.rostova@techproduct.co",
    phone: "+49 30 98765432",
    location: "Berlin, Germany",
    website: "https://elenarostova.io",
    linkedin: "linkedin.com/in/elenarostova",
    github: "",
    photoUrl: ""
  },
  professionalSummary:
    "Data-driven Technical Product Manager with 6+ years driving enterprise SaaS solutions from concept to £25M ARR. Blends engineering background with strategic product discovery, customer obsession, and agile execution. Proven record of launching machine learning features that increased user retention by 28% and driving cross-functional alignment across 30+ stakeholders.",
  workExperience: [
    {
      id: "exp-pm-1",
      jobTitle: "Senior Product Manager - Core Platform",
      company: "DataVantage Analytics",
      location: "Berlin, Germany",
      startDate: "Mar 2022",
      endDate: "Present",
      current: true,
      highlights: [
        "Led product strategy and roadmap for enterprise cloud analytics suite, driving 34% YoY ARR expansion across Tier-1 accounts.",
        "Spearheaded user research across 40+ enterprise customers, validating requirements for self-serve dashboarding feature.",
        "Partnered with engineering and data science leads to launch predictive anomaly alerting with 94% precision rate.",
        "Instituted OKR framework and product analytics tracking in Mixpanel, improving product team sprint predictability by 40%."
      ]
    },
    {
      id: "exp-pm-2",
      jobTitle: "Technical Product Manager",
      company: "NextGen Mobility",
      location: "Munich, Germany",
      startDate: "Oct 2019",
      endDate: "Feb 2022",
      current: false,
      highlights: [
        "Managed fleet optimization API roadmap, scaling partner integrations from 12 to 85 partners across EMEA.",
        "Reduced customer onboarding cycle from 21 days to 4 days through standardized API documentation and sandbox developer portals.",
        "Collaborated with UX design team on redesign of dispatch operator console, cutting order dispatch time by 25%."
      ]
    }
  ],
  education: [
    {
      id: "edu-pm-1",
      degree: "M.Sc. in Management & Technology",
      field: "Information Systems",
      school: "Technical University of Munich (TUM)",
      location: "Munich, Germany",
      startDate: "Sep 2017",
      endDate: "Jul 2019",
      current: false,
      details: "Graduated with High Honors • Focus on Product Innovation & Business Analytics"
    }
  ],
  skills: [
    { id: "sk-pm-1", name: "Product Roadmap & Strategy", level: "Expert" },
    { id: "sk-pm-2", name: "Agile / Scrum Leadership", level: "Expert" },
    { id: "sk-pm-3", name: "Data Analysis & SQL", level: "Advanced" },
    { id: "sk-pm-4", name: "API & System Architecture", level: "Advanced" },
    { id: "sk-pm-5", name: "A/B Testing & Mixpanel", level: "Expert" }
  ],
  languages: [
    { id: "lang-pm-1", name: "English", level: "Fluent" },
    { id: "lang-pm-2", name: "German", level: "Professional" },
    { id: "lang-pm-3", name: "Russian", level: "Native" }
  ],
  hobbies: "Podcasting on Tech Leadership, classical piano, alpine skiing",
  customSections: [
    {
      id: "cust-pm-1",
      title: "Core Methodologies",
      items: [
        "Design Thinking & Customer Discovery Interviews",
        "Dual-Track Agile & Continuous Product Discovery",
        "Executive Stakeholder Governance & Business Case Modeling"
      ]
    }
  ],
  designConfig: {
    templateId: "nordic-clean",
    primaryColor: "#0f766e",
    secondaryColor: "#134e4a",
    accentColor: "#0d9488",
    fontFamily: "Outfit",
    fontSize: "medium",
    spacingDensity: "standard",
    showPhoto: true,
    showIcons: true
  }
};

export const initialSampleResumes = [
  {
    id: "resume-initial-1",
    title: "Jordan Reed (Cloud Infrastructure & DevOps)",
    targetRole: "Junior IT Infrastructure Project Manager",
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 3600000 * 2,
    data: initialCvData
  },
  {
    id: "resume-initial-2",
    title: "Alex Morgan (Senior Full-Stack Engineer)",
    targetRole: "Senior Full-Stack Software Engineer",
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 3600000 * 12,
    data: sampleSoftwareEngineerData
  },
  {
    id: "resume-initial-3",
    title: "Elena Rostova (Technical Product Manager)",
    targetRole: "Senior Technical Product Manager",
    createdAt: Date.now() - 86400000 * 14,
    updatedAt: Date.now() - 3600000 * 24,
    data: sampleProductManagerData
  }
];

export const templateOptions = [
  {
    id: "signature-teal",
    name: "Signature Teal",
    subtitle: "Exact reference layout with teal sidebar & top photo badge",
    description: "Distinct two-column layout featuring a crisp colored sidebar for skills & summary, and a spacious main column for work experience timeline.",
    tags: ["Reference", "Two Column", "Popular"],
    recommendedFor: "IT Professionals, Project Coordinators, DevOps",
    category: "two-column",
    badgeColor: "#4392a8"
  },
  {
    id: "executive-navy",
    name: "Executive Navy",
    subtitle: "Corporate header banner with dual-column balance",
    description: "Authoritative design tailored for directors, senior leads, and corporate managers. Features an executive banner and well-proportioned two-column body.",
    tags: ["Executive", "Corporate", "Leadership"],
    recommendedFor: "Senior Managers, Directors, Consultants",
    category: "executive",
    badgeColor: "#1e3a8a"
  },
  {
    id: "minimalist-ats",
    name: "Minimalist ATS",
    subtitle: "Clean single-column standard optimized for automated parsers",
    description: "Maximum compatibility with Workday, Greenhouse, Taleo, and Lever ATS systems. Zero parsing traps, single-column hierarchy, and clean bullet structure.",
    tags: ["ATS 100%", "Single Column", "Recruiter Favorite"],
    recommendedFor: "Online Job Applications, High-Volume Submissions",
    category: "ats",
    badgeColor: "#111827"
  },
  {
    id: "modern-creative",
    name: "Modern Creative",
    subtitle: "Vibrant gradient header with modern cards & skill pills",
    description: "Eye-catching design with smooth gradient accents, rounded badges, and structured timeline cards. Ideal for design-forward and fast-growing tech roles.",
    tags: ["Modern", "Gradient", "Creative"],
    recommendedFor: "UX/UI Designers, Frontend Engineers, Marketing",
    category: "modern",
    badgeColor: "#8b5cf6"
  },
  {
    id: "nordic-clean",
    name: "Nordic Clean",
    subtitle: "Scandinavian editorial grid with balanced asymmetry",
    description: "Elegant Swiss/Nordic typography, subtle dividers, and clean aesthetic. Favored by high-growth startups and modern European tech hubs.",
    tags: ["Minimalist", "Editorial", "Modern"],
    recommendedFor: "Product Managers, Tech Leads, Analysts",
    category: "modern",
    badgeColor: "#0f766e"
  },
  {
    id: "tech-lead",
    name: "Tech Lead & DevOps",
    subtitle: "Terminal-inspired code accents with Git timeline nodes",
    description: "Engineered specifically for developers, systems engineers, and cloud architects. Features commit-node bullet styling and a structured technical skills matrix.",
    tags: ["DevOps", "Developer", "Code Theme"],
    recommendedFor: "Software Engineers, DevOps, SREs, Architects",
    category: "tech",
    badgeColor: "#0284c7"
  },
  {
    id: "elegant-serif",
    name: "Ivy League Serif",
    subtitle: "Classic Harvard / Oxford academic and executive style",
    description: "Timeless elegance with formal serif headings, double rule headers, and traditional academic formatting. Commands trust in traditional industries.",
    tags: ["Academic", "Executive", "Traditional"],
    recommendedFor: "Finance, Consulting, Law, Research, Academia",
    category: "executive",
    badgeColor: "#334155"
  },
  {
    id: "compact-grid",
    name: "Compact Dual Grid",
    subtitle: "High-density 2-column layout engineered for 1-page fit",
    description: "High information density without crowding. Specifically calibrated to fit extensive careers, multiple jobs, and detailed skills into exactly 1 A4 page.",
    tags: ["1-Page Fit", "High Density", "Two Column"],
    recommendedFor: "Experienced Professionals with dense career histories",
    category: "two-column",
    badgeColor: "#d97706"
  }
];

export const sampleRoles = [
  {
    role: "DevOps Engineer / Infrastructure",
    bullets: [
      "Engineered automated CI/CD pipelines utilizing GitLab CI and GitHub Actions, cutting build duration by 42%.",
      "Architected IaC Terraform modules for multi-environment cloud infrastructure deployment with zero downtime.",
      "Administered Kubernetes clusters and Dockerized microservices, boosting container deployment density.",
      "Implemented Prometheus and Grafana telemetry monitoring dashboards, enabling proactive incident response."
    ]
  },
  {
    role: "IT Project Coordinator / PM",
    bullets: [
      "Coordinated cross-functional engineering teams across 6 concurrent project tracks, ensuring 98% on-time milestone delivery.",
      "Facilitated daily standups, backlog grooming, and sprint retrospectives adhering to Agile/Scrum methodologies.",
      "Authored comprehensive project charters, technical risk registers, and executive progress reports.",
      "Managed vendor relationships and technical procurement pipelines, trimming project expenditure by 15%."
    ]
  },
  {
    role: "Software Developer",
    bullets: [
      "Developed high-throughput RESTful and GraphQL APIs handling over 2M requests daily with sub-50ms latency.",
      "Refactored legacy monolithic services into modular, containerized microservices architecture.",
      "Maintained 90%+ unit and integration test coverage utilizing Jest, Vitest, and Cypress.",
      "Collaborated with UX/UI designers to produce intuitive, WCAG-compliant responsive interfaces."
    ]
  }
];

export const colorPalettes = [
  { id: "teal", name: "Signature Teal", primary: "#4392a8", secondary: "#27363e", accent: "#337286" },
  { id: "navy", name: "Executive Navy", primary: "#1e3a8a", secondary: "#0f172a", accent: "#2563eb" },
  { id: "emerald", name: "Nordic Emerald", primary: "#0f766e", secondary: "#134e4a", accent: "#0d9488" },
  { id: "cyan", name: "Cyber Blue", primary: "#0284c7", secondary: "#0f172a", accent: "#38bdf8" },
  { id: "slate", name: "Modern Charcoal", primary: "#334155", secondary: "#1e293b", accent: "#475569" },
  { id: "burgundy", name: "Rich Burgundy", primary: "#881337", secondary: "#4c0519", accent: "#9f1239" },
  { id: "indigo", name: "Royal Indigo", primary: "#4338ca", secondary: "#1e1b4b", accent: "#6366f1" },
  { id: "amber", name: "Warm Amber", primary: "#b45309", secondary: "#451a03", accent: "#d97706" },
  { id: "copper", name: "Rose Copper", primary: "#9a3412", secondary: "#431407", accent: "#c2410c" },
  { id: "forest", name: "Pine Forest", primary: "#166534", secondary: "#052e16", accent: "#15803d" },
  { id: "amethyst", name: "Deep Amethyst", primary: "#7e22ce", secondary: "#3b0764", accent: "#9333ea" },
  { id: "obsidian", name: "Mono Obsidian", primary: "#18181b", secondary: "#09090b", accent: "#3f3f46" }
];

export const fontPairings = [
  { id: "Inter", name: "Inter (Modern Sans)", category: "Clean & Universal", description: "Default industry standard for maximum clarity and ATS legibility" },
  { id: "Plus Jakarta Sans", name: "Plus Jakarta Sans (Crisp Geometric)", category: "Modern Tech", description: "Ultra-sharp typography popular in modern European & Silicon Valley startups" },
  { id: "Outfit", name: "Outfit (Creative Dynamic)", category: "Display Sans", description: "Vibrant and contemporary with generous letter spacing" },
  { id: "Merriweather", name: "Merriweather (Executive Serif)", category: "Classic Serif", description: "Distinguished editorial serif for senior leadership, finance, and academia" }
];

export const stylePresets = [
  {
    id: "preset-teal",
    name: "Signature Teal (Reference)",
    templateId: "signature-teal",
    paletteId: "teal",
    fontFamily: "Inter",
    spacingDensity: "standard",
    description: "Modern 2-column sidebar with teal accents and verified ATS readability"
  },
  {
    id: "preset-tech",
    name: "Silicon Valley Tech Lead",
    templateId: "tech-lead",
    paletteId: "cyan",
    fontFamily: "Plus Jakarta Sans",
    spacingDensity: "standard",
    description: "Terminal styling with high-contrast cyber blue accents"
  },
  {
    id: "preset-executive",
    name: "Wall Street Executive",
    templateId: "executive-navy",
    paletteId: "navy",
    fontFamily: "Merriweather",
    spacingDensity: "standard",
    description: "Navy blue header with authoritative serif typography"
  },
  {
    id: "preset-ats",
    name: "Pure Minimalist ATS",
    templateId: "minimalist-ats",
    paletteId: "obsidian",
    fontFamily: "Inter",
    spacingDensity: "compact",
    description: "100% parseable monochrome single-column layout"
  },
  {
    id: "preset-nordic",
    name: "Nordic Minimalist",
    templateId: "nordic-clean",
    paletteId: "emerald",
    fontFamily: "Inter",
    spacingDensity: "relaxed",
    description: "Spacious Scandinavian aesthetic with deep pine emeralds"
  },
  {
    id: "preset-creative",
    name: "Creative Modern Card",
    templateId: "modern-creative",
    paletteId: "amethyst",
    fontFamily: "Outfit",
    spacingDensity: "standard",
    description: "Contemporary card blocks with purple amethyst accents"
  }
];

export const coverLetterPresets = [
  {
    id: "cl-infra",
    title: "IT Project Coordinator & DevOps",
    subject: "Application for IT Infrastructure Project Coordinator",
    bodyParagraphs: [
      "I am writing to express my enthusiastic interest in the IT Infrastructure Project Coordinator position. With hands-on DevOps automation, systems administration, and service migration experience, I bring a unique combination of technical fluency and cross-functional coordination skills to your engineering organization.",
      "In my work at CloudScale Systems, I designed GitLab CI/CD pipelines that reduced release cycles by 35% and provisioned multi-environment infrastructure using Terraform and Ansible. This direct technical grounding enables me to coordinate effectively with systems architects, developers, and business stakeholders, ensuring complex infrastructure milestones are met with zero downtime.",
      "Your company's commitment to modernization and cloud scalability aligns perfectly with my career focus. I am confident that my structured Agile approach, proactive risk mitigation, and disciplined execution will make an immediate contribution to your ongoing initiatives.",
      "Thank you for reviewing my application. I would welcome the opportunity to discuss how my technical background and coordination abilities can support your team's upcoming goals."
    ]
  },
  {
    id: "cl-software",
    title: "Full-Stack Software Engineer",
    subject: "Application for Senior Full-Stack Software Engineer",
    bodyParagraphs: [
      "I am thrilled to submit my application for the Software Engineer role. Having architected and shipped high-concurrency web applications serving hundreds of thousands of active users, I am eager to bring my expertise in modern web frameworks and distributed microservices to your team.",
      "Throughout my career, I have prioritized shipping clean, thoroughly tested code that solves real business bottlenecks. By optimizing state workflows, implementing robust APIs, and tuning database performance, I have helped engineering teams reduce latency by over 40% while accelerating sprint release velocity.",
      "I admire your product vision and culture of engineering excellence. I look forward to contributing to your architecture, collaborating closely with design and product partners, and scaling your core platforms.",
      "Thank you for your time and consideration. I would love the chance to connect for an interview."
    ]
  },
  {
    id: "cl-general",
    title: "General Professional & Career Growth",
    subject: "Application for Professional Opportunity",
    bodyParagraphs: [
      "I am writing to express my strong interest in joining your team. With a proven record of managing complex technical and operational responsibilities, I thrive in environments that demand accountability, rapid problem-solving, and clear communication.",
      "My background is defined by a commitment to continuous improvement—whether identifying process inefficiencies, coordinating diverse stakeholders, or executing critical projects to high standards of quality and timeliness.",
      "I am drawn to your organization's forward-thinking approach and collaborative culture. I am eager to apply my skills, energy, and dedication to help achieve your strategic goals.",
      "Thank you for your consideration. I look forward to speaking with you about how my background aligns with your team's needs."
    ]
  }
];

export const starterBestPracticeData = {
  personalInfo: {
    fullName: "David K. Vance",
    jobTitle: "Senior Cloud & Platform Engineering Specialist",
    email: "david.vance@cloudplatform.tech",
    phone: "+1 (555) 349-8201",
    location: "San Francisco, CA (Open to Remote)",
    website: "https://davidvance.cloud",
    linkedin: "linkedin.com/in/davidvance-cloud",
    github: "github.com/davidvance-tech",
    photoUrl: ""
  },
  professionalSummary:
    "Strategic Senior Cloud & Platform Engineer with 8+ years architecting resilient multi-cloud platforms and high-velocity developer delivery pipelines. Proven track record reducing cloud infrastructure spend by 38% ($240K/yr) while maintaining 99.99% uptime across 60+ production microservices. Certified Kubernetes Administrator (CKA) and AWS Solutions Architect Professional dedicated to developer velocity, zero-trust security, and automated observability.",
  workExperience: [
    {
      id: "exp-sb-1",
      jobTitle: "Staff Cloud Infrastructure Architect",
      company: "Nordic Cloud Innovations",
      location: "San Francisco, CA / Remote",
      startDate: "Jan 2023",
      endDate: "Present",
      current: true,
      highlights: [
        "Architected multi-region AWS Kubernetes (EKS) infrastructure handling 400M+ requests/day with 99.99% uptime SLA.",
        "Orchestrated infrastructure-as-code migration to Terraform & Terragrunt across 60+ accounts, cutting deployment errors by 70%.",
        "Reduced monthly cloud compute and storage expenditure by 38% ($240K annual savings) through Graviton spot instances and Karpenter auto-scaling.",
        "Engineered zero-trust service mesh using Istio and mTLS, achieving SOC2 Type II and ISO 27001 compliance ahead of audit deadline."
      ]
    },
    {
      id: "exp-sb-2",
      jobTitle: "Senior DevOps & Site Reliability Engineer",
      company: "Veloce Media Systems",
      location: "Austin, TX",
      startDate: "Mar 2020",
      endDate: "Dec 2022",
      current: false,
      highlights: [
        "Built GitOps-driven GitLab CI/CD pipelines deploying to Kubernetes clusters in under 12 minutes with automated canary rollouts.",
        "Implemented comprehensive Prometheus, Grafana, and OpenTelemetry monitoring, driving MTTR down from 45m to 8m.",
        "Mentored team of 8 engineers in container orchestration, IaC best practices, and automated testing."
      ]
    },
    {
      id: "exp-sb-3",
      jobTitle: "Systems & Cloud Automation Engineer",
      company: "Apex Enterprise Tech",
      location: "Denver, CO",
      startDate: "Jun 2017",
      endDate: "Feb 2020",
      current: false,
      highlights: [
        "Automated configuration of 150+ Linux production servers using Ansible and Python, eliminating manual drift.",
        "Migrated on-premise datacenter databases to AWS RDS PostgreSQL with under 3 minutes of scheduled cutover downtime."
      ]
    }
  ],
  education: [
    {
      id: "edu-sb-1",
      degree: "M.S. in Computer Science & Distributed Systems",
      field: "Cloud Systems Architecture",
      school: "University of Washington",
      location: "Seattle, WA",
      startDate: "Sep 2015",
      endDate: "Jun 2017",
      current: false,
      details: "Graduated with Honors • Thesis on Distributed Consensus Protocols"
    },
    {
      id: "edu-sb-2",
      degree: "B.S. in Computer Engineering",
      field: "Computer Science",
      school: "University of Colorado Boulder",
      location: "Boulder, CO",
      startDate: "Sep 2011",
      endDate: "May 2015",
      current: false,
      details: "Dean's List (2013 - 2015) • ACM Student Chapter Lead"
    }
  ],
  skills: [
    { id: "sk-sb-1", name: "Kubernetes (EKS/GKE)", level: "Expert" },
    { id: "sk-sb-2", name: "Terraform & Terragrunt", level: "Expert" },
    { id: "sk-sb-3", name: "AWS & GCP Cloud Architecture", level: "Expert" },
    { id: "sk-sb-4", name: "CI/CD & GitOps (ArgoCD)", level: "Expert" },
    { id: "sk-sb-5", name: "Python, Go & Bash", level: "Advanced" },
    { id: "sk-sb-6", name: "Observability & OpenTelemetry", level: "Advanced" },
    { id: "sk-sb-7", name: "Istio Service Mesh & mTLS", level: "Advanced" },
    { id: "sk-sb-8", name: "Linux Systems Hardening", level: "Expert" }
  ],
  languages: [
    { id: "lang-sb-1", name: "English", level: "Native" },
    { id: "lang-sb-2", name: "Spanish", level: "B2 - Professional" },
    { id: "lang-sb-3", name: "German", level: "A2 - Elementary" }
  ],
  hobbies: "Open-source maintainer, marathon runner, alpine photography, mechanical keyboard building",
  customSections: [
    {
      id: "cust-sb-1",
      title: "Key Certifications",
      items: [
        "AWS Certified Solutions Architect – Professional (2025)",
        "Certified Kubernetes Administrator (CKA) – Linux Foundation (2024)",
        "HashiCorp Certified: Terraform Associate (003)"
      ]
    },
    {
      id: "cust-sb-2",
      title: "Featured Engineering Projects",
      items: [
        "KubeCost-Automator: Open-source CLI tool with 2.4k GitHub stars for auto-rightsizing Kubernetes cluster pods.",
        "Serverless Telemetry Gateway: Kafka & AWS Lambda high-throughput pipeline handling 50k events/sec with zero loss."
      ]
    }
  ],
  designConfig: {
    templateId: "tech-lead",
    primaryColor: "#0284c7",
    secondaryColor: "#0f172a",
    accentColor: "#38bdf8",
    fontFamily: "Plus Jakarta Sans",
    fontSize: "medium",
    spacingDensity: "standard",
    showPhoto: true,
    showIcons: true
  },
  coverLetter: {
    recipientName: "Engineering Hiring Team",
    recipientTitle: "VP of Infrastructure Engineering",
    companyName: "NextScale Cloud Systems",
    companyAddress: "San Francisco, CA",
    date: "October 9, 2026",
    subject: "Application for Senior Cloud & Platform Engineering Specialist",
    salutation: "Dear Hiring Team,",
    bodyParagraphs: [
      "I am writing to express my strong enthusiasm for the Senior Cloud & Platform Engineering Specialist position. With more than eight years architecting resilient multi-cloud Kubernetes infrastructure, designing GitOps pipelines, and driving down cloud compute expenditure, I bring deep hands-on expertise to your core platform initiatives.",
      "At Nordic Cloud Innovations, I spearheaded our multi-region AWS EKS rollout handling over 400 million daily requests while reducing monthly infrastructure expenditure by 38% ($240K annually). My approach combines relentless automation through Terraform and Terragrunt with robust zero-trust security postures and end-to-end OpenTelemetry observability.",
      "I have long admired your platform's high-velocity developer culture and commitment to open-source systems. I am excited by the opportunity to bring my technical architecture leadership and collaborative mentorship to accelerate your upcoming cloud delivery milestones.",
      "Thank you very much for your time and consideration. I welcome the opportunity to discuss how my background can directly contribute to your infrastructure roadmap."
    ],
    signOff: "Warm regards,",
    senderName: "David K. Vance"
  },
  sectionConfig: {
    order: ['summary', 'experience', 'education', 'skills', 'languages', 'customSections', 'hobbies'],
    hidden: {
      summary: false,
      experience: false,
      education: false,
      skills: false,
      languages: false,
      customSections: false,
      hobbies: false
    }
  }
};

export const createBlankCvData = ({
  fullName = '',
  jobTitle = '',
  email = '',
  phone = '',
  location = '',
  templateId = 'signature-teal',
  primaryColor = '#4392a8',
  fontFamily = 'Inter'
} = {}) => ({
  personalInfo: {
    fullName,
    jobTitle,
    email,
    phone,
    location,
    website: '',
    linkedin: '',
    github: '',
    photoUrl: ''
  },
  professionalSummary: '',
  workExperience: [],
  education: [],
  skills: [],
  languages: [],
  hobbies: '',
  customSections: [],
  designConfig: {
    templateId,
    primaryColor,
    secondaryColor: '#1e293b',
    accentColor: primaryColor,
    fontFamily,
    fontSize: 'medium',
    spacingDensity: 'standard',
    showPhoto: true,
    showIcons: true
  },
  coverLetter: {
    recipientName: 'Hiring Team',
    recipientTitle: 'Hiring Manager',
    companyName: 'Target Company',
    companyAddress: '',
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    subject: `Application for ${jobTitle || 'Role'}`,
    salutation: 'Dear Hiring Manager,',
    bodyParagraphs: [
      `I am writing to express my strong enthusiasm for the ${jobTitle || 'position'} at your organization.`,
      'With my proven technical background and dedication to high-quality execution, I am eager to contribute to your team goals.',
      'Thank you for your consideration. I look forward to speaking with you.'
    ],
    signOff: 'Sincerely,',
    senderName: fullName || 'Candidate'
  },
  sectionConfig: {
    order: ['summary', 'experience', 'education', 'skills', 'languages', 'customSections', 'hobbies'],
    hidden: {
      summary: false,
      experience: false,
      education: false,
      skills: false,
      languages: false,
      customSections: false,
      hobbies: false
    }
  }
});
