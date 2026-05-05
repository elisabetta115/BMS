// Run: npx ts-node --compiler-options '{"module":"commonjs"}' prisma/seed.ts
// Or add to package.json prisma.seed and run: npx prisma db seed

import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // ─── Create admin user ────────────────────────────────────
  const adminEmail = "admin@boostmyskills.eu";
  const adminPassword = await bcryptjs.hash("Admin123!", 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { role: "ADMIN" },
    create: {
      name: "Admin",
      email: adminEmail,
      passwordHash: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("Admin user created: admin@boostmyskills.eu / Admin123!");

  // ─── Micro-credentials ────────────────────────────────────
  const credentialData = [
    { title: "Fundamentals of Energy Systems", slug: "fundamentals-energy-systems", code: "MC01", project: "RES4CITY" },
    { title: "Introduction to Renewable Energies", slug: "intro-renewable-energies", code: "MC02", project: "RES4CITY" },
    { title: "Introduction to Sustainable Finance", slug: "intro-sustainable-finance", code: "MC03", project: "RES4CITY" },
    { title: "Data Analytics for the Energy Sector", slug: "data-analytics-energy", code: "MC04", project: "RES4CITY" },
    { title: "Efficient Building Techniques", slug: "efficient-building-techniques", code: "MC05", project: "RES4CITY" },
    { title: "Tools for City Decarbonisation", slug: "tools-city-decarbonisation", code: "MC06", project: "RES4CITY" },
    { title: "Energy Utilisation and Storage", slug: "energy-utilisation-storage", code: "MC07", project: "RES4CITY" },
    { title: "Case Studies in Energy Management", slug: "case-studies-energy-management", code: "MC08", project: "RES4CITY" },
    { title: "Energy Policy and Flexible Technologies", slug: "energy-policy-flexible-tech", code: "MC09", project: "RES4CITY" },
    { title: "Serious Game", slug: "serious-game", code: "MC10", project: "RES4CITY" },
    { title: "Sustainable Business Models", slug: "sustainable-business-models", code: "MC11", project: "RES4CITY" },
    { title: "Energy Strategy and Energy Transition", slug: "energy-strategy-transition", code: "MC12", project: "RES4CITY" },
    { title: "Social Acceptance of Technologies", slug: "social-acceptance-technologies", code: "MC13", project: "RES4CITY" },
    { title: "Energy Communities", slug: "energy-communities", code: "MC14", project: "RES4CITY" },
    { title: "Sustainable Development Goals for Cities", slug: "sdg-cities", code: "MC15", project: "RES4CITY" },
    { title: "Circular Economy for Sustainable Cities", slug: "circular-economy-cities", code: "MC16", project: "RES4CITY" },
    { title: "Energy Management and Smart Communities", slug: "energy-management-smart-communities", code: "MC17", project: "RES4CITY" },
    { title: "Decarbonisation of Thermal Energy", slug: "decarbonisation-thermal-energy", code: "MC18", project: "RES4CITY" },
    { title: "Analysis of Energy Consumption", slug: "analysis-energy-consumption", code: "MC19", project: "RES4CITY" },
    { title: "Advanced Modelling of Buildings and Energy Systems", slug: "advanced-modelling-buildings", code: "MC20", project: "RES4CITY" },
    { title: "Economics and Physics of Energy Storage", slug: "economics-physics-energy-storage", code: "MC21", project: "RES4CITY" },
    { title: "Biogas Systems for Climate Transition", slug: "biogas-systems-climate", code: "MC22", project: "RES4CITY" },
    { title: "Small Scale Wind Power", slug: "small-scale-wind-power", code: "MC23", project: "RES4CITY" },
    { title: "Tools, Strategies and Trends in Sustainable Finance", slug: "tools-strategies-sustainable-finance", code: "MC24", project: "RES4CITY" },
    { title: "Urban Renewable Energy: Decision Making Methodologies", slug: "urban-renewable-decision-making", code: "MC25", project: "RES4CITY" },
    { title: "Management of Innovation Projects", slug: "management-innovation-projects", code: "MC26", project: "RES4CITY" },
    { title: "Strategic Behaviour in Energy Markets: Options and Games", slug: "strategic-behaviour-energy-markets", code: "MC27", project: "RES4CITY" },
    { title: "Climate Risk and Climate Investing", slug: "climate-risk-investing", code: "MC28", project: "RES4CITY" },
    { title: "Thermal Simulation of Buildings", slug: "thermal-simulation-buildings", code: "MC29", project: "RES4CITY" },
    { title: "Understanding Critical Raw Materials", slug: "understanding-critical-raw-materials", code: "MC30", project: "RES4CITY" },
    { title: "Urban Metabolism Strategies", slug: "urban-metabolism-strategies", code: "MC31", project: "RES4CITY" },
    { title: "Renewable Energy Investments", slug: "renewable-energy-investments", code: "MC32", project: "RES4CITY" },
    { title: "Hydrogen Technologies for Urban Areas", slug: "hydrogen-technologies-urban", code: "MC33", project: "RES4CITY" },
    { title: "Positive Energy Districts", slug: "positive-energy-districts", code: "MC34", project: "RES4CITY" },
    { title: "Decision-Making for Energy Projects under Uncertainty", slug: "decision-making-energy-uncertainty", code: "MC35", project: "RES4CITY" },
    { title: "Energy Justice and Poverty", slug: "energy-justice-poverty", code: "MC36", project: "RES4CITY" },
    { title: "Gender Mainstreaming and Intersectionality", slug: "gender-mainstreaming-intersectionality", code: "MC37", project: "RES4CITY" },
    { title: "Energy Policy", slug: "energy-policy", code: "MC38", project: "RES4CITY" },
    { title: "How Sustainable is your City?", slug: "how-sustainable-is-your-city", code: "MC39", project: "RES4CITY" },
    { title: "Digital Payments and Smart City Platforms", slug: "digital-payments-smart-city", code: "MC40", project: "RES4CITY" },
    { title: "Enacting a Circular Economy", slug: "enacting-circular-economy", code: "MC41", project: "RES4CITY" },
    { title: "Investing in Sustainability", slug: "investing-sustainability", code: "MC42", project: "RES4CITY" },
    { title: "Introduction to Industrial Organization", slug: "intro-industrial-organization", code: "MC43", project: "RES4CITY" },
    { title: "Energy Markets", slug: "energy-markets", code: "MC44", project: "RES4CITY" },
    // SHERLOCK credentials
    { title: "Basics of Energy Efficiency", slug: "basics-energy-efficiency", code: "MC01S", project: "SHERLOCK" },
    { title: "Decision-making towards a Sustainable City", slug: "decision-making-sustainable-city", code: "MC02S", project: "SHERLOCK" },
    { title: "Environmental Social Governance Finance", slug: "esg-finance", code: "MC03S", project: "SHERLOCK" },
    { title: "Advertising and Public Relations in the Energy Sector", slug: "advertising-pr-energy", code: "MC04S", project: "SHERLOCK" },
    { title: "Systemic Design For Energy Retrofitting", slug: "systemic-design-energy-retrofitting", code: "MC05S", project: "SHERLOCK" },
    { title: "Green Infrastructure Finance", slug: "green-infrastructure-finance", code: "MC06S", project: "SHERLOCK" },
    { title: "Communication Strategies with Financial Institutions", slug: "communication-financial-institutions", code: "MC07S", project: "SHERLOCK" },
    { title: "Business Model for Energy Efficiency in Buildings", slug: "business-model-energy-efficiency", code: "MC08S", project: "SHERLOCK" },
    { title: "Energy Performance Contracting (EPC)", slug: "energy-performance-contracting", code: "MC09S", project: "SHERLOCK" },
    { title: "Probabilistic Approach for Energy Efficiency Evaluation", slug: "probabilistic-energy-efficiency", code: "MC10S", project: "SHERLOCK" },
    { title: "Energy Auditing of Buildings", slug: "energy-auditing-buildings", code: "MC11S", project: "SHERLOCK" },
    { title: "Incorporation of Natural Materials in Energy Renovation of Buildings", slug: "natural-materials-energy-renovation", code: "MC12S", project: "SHERLOCK" },
    { title: "Life Cycle Analysis in Construction", slug: "life-cycle-analysis-construction", code: "MC13S", project: "SHERLOCK" },
    { title: "Circular Economy in the Built Environment", slug: "circular-economy-built-environment", code: "MC14S", project: "SHERLOCK" },
    { title: "Energy Consumption in Buildings", slug: "energy-consumption-buildings", code: "MC15S", project: "SHERLOCK" },
  ];

  const credentialMap: Record<string, string> = {};

  for (const cred of credentialData) {
    const result = await prisma.microCredential.upsert({
      where: { slug: cred.slug },
      update: { title: cred.title, code: cred.code, project: cred.project },
      create: { ...cred, passGrade: 50 },
    });
    credentialMap[cred.title] = result.id;
  }
  console.log(`Seeded ${credentialData.length} micro-credentials.`);

  // ─── Micro-programmes ─────────────────────────────────────
  const programmeData = [
    {
      title: "Sustainable Energy Technologies and Strategies in Urban Environments",
      slug: "mp1", code: "MP1", project: "RES4CITY",
      credentials: [
        "Fundamentals of Energy Systems", "Introduction to Renewable Energies", "Introduction to Sustainable Finance",
        "Data Analytics for the Energy Sector", "Efficient Building Techniques", "Tools for City Decarbonisation",
        "Energy Utilisation and Storage", "Case Studies in Energy Management", "Energy Policy and Flexible Technologies", "Serious Game",
      ],
    },
    {
      title: "Decarbonization Strategies and Social Innovation for Cities and Communities",
      slug: "mp2", code: "MP2", project: "RES4CITY",
      credentials: [
        "Fundamentals of Energy Systems", "Introduction to Renewable Energies", "Introduction to Sustainable Finance",
        "Sustainable Business Models", "Energy Strategy and Energy Transition", "Social Acceptance of Technologies",
        "Energy Communities", "Sustainable Development Goals for Cities", "Circular Economy for Sustainable Cities", "Serious Game",
      ],
    },
    {
      title: "Advanced Design of Sustainable Cities",
      slug: "mp3", code: "MP3", project: "RES4CITY",
      credentials: [
        "Introduction to Sustainable Finance", "Data Analytics for the Energy Sector",
        "Energy Management and Smart Communities", "Decarbonisation of Thermal Energy",
        "Analysis of Energy Consumption", "Advanced Modelling of Buildings and Energy Systems",
        "Economics and Physics of Energy Storage", "Biogas Systems for Climate Transition", "Small Scale Wind Power", "Serious Game",
      ],
    },
    {
      title: "Business Strategies for a Sustainable Urban Transition",
      slug: "mp4", code: "MP4", project: "RES4CITY",
      credentials: [
        "Introduction to Renewable Energies", "Tools, Strategies and Trends in Sustainable Finance",
        "Circular Economy for Sustainable Cities", "Sustainable Business Models", "Energy Strategy and Energy Transition",
        "Urban Renewable Energy: Decision Making Methodologies", "Management of Innovation Projects",
        "Strategic Behaviour in Energy Markets: Options and Games", "Climate Risk and Climate Investing", "Serious Game",
      ],
    },
    {
      title: "Sustainability by Design: Developing a Resilient Built Environment",
      slug: "mp5", code: "MP5", project: "RES4CITY",
      credentials: [
        "Efficient Building Techniques", "Thermal Simulation of Buildings", "Understanding Critical Raw Materials",
        "Urban Metabolism Strategies", "Renewable Energy Investments", "Tools for City Decarbonisation",
        "Advanced Modelling of Buildings and Energy Systems", "Hydrogen Technologies for Urban Areas", "Positive Energy Districts", "Serious Game",
      ],
    },
    {
      title: "Innovation in the Urban Energy Sector: Strategies and Management",
      slug: "mp6", code: "MP6", project: "RES4CITY",
      credentials: [
        "Introduction to Renewable Energies", "Decision-Making for Energy Projects under Uncertainty",
        "Management of Innovation Projects", "Social Acceptance of Technologies", "Renewable Energy Investments",
        "Sustainable Business Models", "Energy Justice and Poverty", "Gender Mainstreaming and Intersectionality",
        "Data Analytics for the Energy Sector", "Serious Game",
      ],
    },
    {
      title: "Sustainable Energy Solutions for Cities: Policy and Implementation Strategies",
      slug: "mp7", code: "MP7", project: "RES4CITY",
      credentials: [
        "Introduction to Renewable Energies", "Energy Policy", "Energy Strategy and Energy Transition",
        "How Sustainable is your City?", "Energy Justice and Poverty", "Social Acceptance of Technologies",
        "Digital Payments and Smart City Platforms", "Enacting a Circular Economy", "Sustainable Business Models", "Serious Game",
      ],
    },
    {
      title: "Sustainable Finance and Energy Transition in Cities",
      slug: "mp8", code: "MP8", project: "RES4CITY",
      credentials: [
        "Introduction to Renewable Energies", "Urban Renewable Energy: Decision Making Methodologies",
        "Tools, Strategies and Trends in Sustainable Finance", "Investing in Sustainability",
        "Introduction to Industrial Organization", "Energy Markets", "Digital Payments and Smart City Platforms",
        "How Sustainable is your City?", "Climate Risk and Climate Investing", "Serious Game",
      ],
    },
    {
      title: "Building Energy Renovation Financing",
      slug: "mp01sher", code: "MP01", project: "SHERLOCK",
      credentials: [
        "Basics of Energy Efficiency", "Decision-making towards a Sustainable City",
        "Environmental Social Governance Finance", "Advertising and Public Relations in the Energy Sector",
        "Systemic Design For Energy Retrofitting", "Green Infrastructure Finance",
        "Communication Strategies with Financial Institutions", "Business Model for Energy Efficiency in Buildings",
        "Energy Performance Contracting (EPC)", "Probabilistic Approach for Energy Efficiency Evaluation",
      ],
    },
    {
      title: "Energy Efficiency in the Building Sector",
      slug: "mp02sher", code: "MP02", project: "SHERLOCK",
      credentials: [
        "Basics of Energy Efficiency", "Decision-making towards a Sustainable City",
        "Environmental Social Governance Finance", "Advertising and Public Relations in the Energy Sector",
        "Systemic Design For Energy Retrofitting", "Energy Auditing of Buildings",
        "Incorporation of Natural Materials in Energy Renovation of Buildings", "Life Cycle Analysis in Construction",
        "Circular Economy in the Built Environment", "Energy Consumption in Buildings",
      ],
    },
  ];

  for (const prog of programmeData) {
    const { credentials, ...progData } = prog;

    const programme = await prisma.microProgramme.upsert({
      where: { slug: prog.slug },
      update: { title: prog.title, code: prog.code, project: prog.project },
      create: progData,
    });

    // Link credentials
    for (let i = 0; i < credentials.length; i++) {
      const credId = credentialMap[credentials[i]];
      if (credId) {
        await prisma.programmeCredential.upsert({
          where: { programmeId_credentialId: { programmeId: programme.id, credentialId: credId } },
          update: { order: i },
          create: { programmeId: programme.id, credentialId: credId, order: i },
        });
      } else {
        console.warn(`Credential not found: "${credentials[i]}"`);
      }
    }
  }
  console.log(`Seeded ${programmeData.length} micro-programmes with credential links.`);

  console.log("Seeding complete!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
