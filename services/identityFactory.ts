// Simulates the IdentityFactory class from the Python script
export const generateIdentity = (): string => {
  const firstNames = ["James", "Emma", "Liam", "Olivia", "Noah", "Ava", "Mason", "Sophia", "Kai", "Zara"];
  const lastNames = ["Smith", "Johnson", "Brown", "Davis", "Miller", "Wilson", "Moore", "Chen", "Patel"];
  
  const fn = firstNames[Math.floor(Math.random() * firstNames.length)];
  const ln = lastNames[Math.floor(Math.random() * lastNames.length)];
  const entropy = Math.floor(Math.random() * 9999);
  
  return `${fn}.${ln}.${entropy}`;
};

export const getRandomUserAgent = (): string => {
  const versions = ['120.0.0.0', '121.0.0.0', '122.0.0.0', '123.0.0.0'];
  const v = versions[Math.floor(Math.random() * versions.length)];
  return `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${v} Safari/537.36`;
};