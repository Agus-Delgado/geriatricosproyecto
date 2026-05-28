export interface GeriatricConfig {
  slug: string;
  displayName: string;
  theme: {
    gradientFrom: string;
    gradientTo: string;
    buttonGradientFrom: string;
    buttonGradientTo: string;
  };
}

export const GERIATRICS: GeriatricConfig[] = [
  {
    slug: 'nuestra-senora-de-lujan',
    displayName: 'Nuestra Señora de Luján',
    theme: {
      gradientFrom: '#8B5CF6',
      gradientTo: '#7C3AED',
      buttonGradientFrom: '#8B5CF6',
      buttonGradientTo: '#7C3AED',
    },
  },
  {
    slug: 'el-trebol',
    displayName: 'El Trébol',
    theme: {
      gradientFrom: '#14B8A6',
      gradientTo: '#0D9488',
      buttonGradientFrom: '#14B8A6',
      buttonGradientTo: '#0D9488',
    },
  },
  {
    slug: 'el-amanecer',
    displayName: 'El Amanecer',
    theme: {
      gradientFrom: '#FB7185',
      gradientTo: '#F43F5E',
      buttonGradientFrom: '#FB7185',
      buttonGradientTo: '#F43F5E',
    },
  },
];

export const getGeriatricBySlug = (slug: string): GeriatricConfig | undefined => {
  return GERIATRICS.find((g) => g.slug === slug);
};
