export const MISSIONS = [
  { 
    id: 'immigration', 
    city: 'London', 
    country: 'UK', 
    title: 'Imigração em Londres', 
    obj: 'Passar pela imigração e explicar o motivo da viagem.', 
    scenario: 'Você acabou de pousar no aeroporto de Heathrow. O oficial de imigração parece sério.', 
    diff: 'Easy', 
    prompt: 'You are an immigration officer at Heathrow. You are polite but firm. Ask about the purpose of the trip, duration, and where they will stay.' 
  },
  { 
    id: 'lost_bag', 
    city: 'New York', 
    country: 'USA', 
    title: 'Mala Perdida no JFK', 
    obj: 'Reportar sua mala perdida no balcão da companhia aérea.', 
    scenario: 'Sua mala não apareceu na esteira. Você precisa falar com o atendente da United Airlines.', 
    diff: 'Medium', 
    prompt: 'You are an airline attendant at JFK airport. A passenger is reporting a lost bag. Ask for the tag number, description of the bag, and contact info.' 
  },
  { 
    id: 'taxi', 
    city: 'Tokyo', 
    country: 'Japan', 
    title: 'Táxi para Shinjuku', 
    obj: 'Pegar um táxi e explicar o endereço do seu hotel.', 
    scenario: 'Você está na saída do aeroporto de Narita. O taxista não fala muito bem português, apenas inglês e japonês.', 
    diff: 'Medium', 
    prompt: 'You are a taxi driver in Tokyo. You speak English with a slight accent. Ask where the passenger wants to go and warn about the traffic.' 
  },
  { 
    id: 'hotel', 
    city: 'Miami', 
    country: 'USA', 
    title: 'Check-in no Hotel', 
    obj: 'Fazer o check-in, mas o recepcionista não encontra sua reserva.', 
    scenario: 'Você chegou ao hotel cansado, mas há um problema com seu nome no sistema.', 
    diff: 'Hard', 
    prompt: 'You are a receptionist at a busy hotel in Miami. You are a bit stressed. You can\'t find the reservation. Ask for the confirmation number and handle the situation firmly but professionally.' 
  }
];
