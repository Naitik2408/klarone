export interface ModelAssetDef {
  productId: number;
  slug: string;
  name: string;
  productHeroUrl: string;
  productOverviewUrls: string[];
  colorVariants: {
    color: string;
    variantUrls: string[];
  }[];
}

export const FIRST_20_LAPTOP_ASSETS: ModelAssetDef[] = [
  // 1. Apple MacBook Pro 14″ (M3 / M3 Pro) - Product #21
  {
    productId: 21,
    slug: "apple-macbook-pro-14-m3-base",
    name: "Apple MacBook Pro 14″ (M3 / M3 Pro)",
    productHeroUrl: "https://www.apple.com/newsroom/images/2023/10/apple-unveils-new-macbook-pro-featuring-m3-chips/article/Apple-MacBook-Pro-2-up-231030_big.jpg.large.jpg",
    productOverviewUrls: [
      "https://www.apple.com/newsroom/images/2023/10/apple-unveils-new-macbook-pro-featuring-m3-chips/article/Apple-MacBook-Pro-display-231030_big.jpg.large.jpg",
      "https://www.apple.com/newsroom/images/2023/10/apple-unveils-new-macbook-pro-featuring-m3-chips/article/Apple-MacBook-Pro-ports-231030_big.jpg.large.jpg"
    ],
    colorVariants: [
      {
        color: "Space Black",
        variantUrls: [
          "https://www.apple.com/newsroom/images/2023/10/apple-unveils-new-macbook-pro-featuring-m3-chips/article/Apple-MacBook-Pro-Space-Black-231030_big.jpg.large.jpg",
          "https://www.apple.com/newsroom/images/2023/10/apple-unveils-new-macbook-pro-featuring-m3-chips/article/Apple-MacBook-Pro-Magic-Keyboard-231030_big.jpg.large.jpg"
        ]
      },
      {
        color: "Silver",
        variantUrls: [
          "https://www.apple.com/newsroom/images/2023/10/apple-unveils-new-macbook-pro-featuring-m3-chips/article/Apple-MacBook-Pro-silver-231030_big.jpg.large.jpg"
        ]
      }
    ]
  },

  // 2. Dell XPS 14 (9440, 2024) - Product #22
  {
    productId: 22,
    slug: "dell-xps-14-9440",
    name: "Dell XPS 14 (9440, 2024)",
    productHeroUrl: "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-14-9440/media-gallery/silver/touch/notebook-xps-14-9440-t-silver-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000",
    productOverviewUrls: [
      "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-14-9440/media-gallery/silver/touch/notebook-xps-14-9440-t-silver-gallery-2.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000",
      "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-14-9440/media-gallery/silver/touch/notebook-xps-14-9440-t-silver-gallery-3.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000"
    ],
    colorVariants: [
      {
        color: "Platinum Silver",
        variantUrls: [
          "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-14-9440/media-gallery/silver/touch/notebook-xps-14-9440-t-silver-gallery-4.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000"
        ]
      },
      {
        color: "Graphite",
        variantUrls: [
          "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-14-9440/media-gallery/graphite/touch/notebook-xps-14-9440-t-black-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000"
        ]
      }
    ]
  },

  // 3. Lenovo Legion Pro 5i Gen 9 (16″ Intel) - Product #23
  {
    productId: 23,
    slug: "lenovo-legion-pro-5i-gen-9",
    name: "Lenovo Legion Pro 5i Gen 9 (16″ Intel)",
    productHeroUrl: "https://p3-ofp.static.pub//fes/cms/2024/01/08/9w1g9b34o432lfs1gug8562fcm06h5481747.png",
    productOverviewUrls: [
      "https://p1-ofp.static.pub//fes/cms/2024/01/08/w03b8e78u0a99w1g9b34o432lfs1gu481748.png"
    ],
    colorVariants: [
      {
        color: "Onyx Grey",
        variantUrls: [
          "https://p3-ofp.static.pub//fes/cms/2024/01/08/9w1g9b34o432lfs1gug8562fcm06h5481747.png"
        ]
      }
    ]
  },

  // 4. ASUS ROG Zephyrus G14 (2024) - Product #24
  {
    productId: 24,
    slug: "asus-rog-zephyrus-g14-2024",
    name: "ASUS ROG Zephyrus G14 (2024)",
    productHeroUrl: "https://dlcdnwebimgs.asus.com/gain/3D7A4D78-3F13-4B85-8025-0E975949C650/w1000/h750",
    productOverviewUrls: [
      "https://dlcdnwebimgs.asus.com/gain/4DF48EE4-E7DF-4A4D-B671-BE522E9B5694/w1000/h750"
    ],
    colorVariants: [
      {
        color: "Eclipse Gray",
        variantUrls: [
          "https://dlcdnwebimgs.asus.com/gain/3D7A4D78-3F13-4B85-8025-0E975949C650/w1000/h750"
        ]
      },
      {
        color: "Platinum White",
        variantUrls: [
          "https://dlcdnwebimgs.asus.com/gain/5B5208FE-ED02-4A8E-BE75-EB96D1217031/w1000/h750"
        ]
      }
    ]
  },

  // 5. HP Spectre x360 14 (2024) - Product #25
  {
    productId: 25,
    slug: "hp-spectre-x360-14-2024",
    name: "HP Spectre x360 14 (2024)",
    productHeroUrl: "https://ssl-product-images.www8-hp.com/digmedialib/world-products/psg_nb_pc_spectre_x360_14_intel_24c1/standard_3_hero_front.png",
    productOverviewUrls: [
      "https://ssl-product-images.www8-hp.com/digmedialib/world-products/psg_nb_pc_spectre_x360_14_intel_24c1/standard_3_angle_left.png"
    ],
    colorVariants: [
      {
        color: "Nightfall Black",
        variantUrls: [
          "https://ssl-product-images.www8-hp.com/digmedialib/world-products/psg_nb_pc_spectre_x360_14_intel_24c1/standard_3_hero_front.png"
        ]
      },
      {
        color: "Slate Blue",
        variantUrls: [
          "https://ssl-product-images.www8-hp.com/digmedialib/world-products/psg_nb_pc_spectre_x360_14_intel_24c1/standard_3_hero_back.png"
        ]
      }
    ]
  },

  // 6. Acer Swift Go 14 (2024) OLED - Product #26
  {
    productId: 26,
    slug: "acer-swift-go-14-2024",
    name: "Acer Swift Go 14 (2024) OLED",
    productHeroUrl: "https://static.acer.com/up/Resource/Acer/Laptops/Swift_Go_14/Images/20240103/Acer-Swift-Go-14_SFG14-73T_Pure-Silver_01.png",
    productOverviewUrls: [
      "https://static.acer.com/up/Resource/Acer/Laptops/Swift_Go_14/Images/20240103/Acer-Swift-Go-14_SFG14-73T_Pure-Silver_02.png"
    ],
    colorVariants: [
      {
        color: "Pure Silver",
        variantUrls: [
          "https://static.acer.com/up/Resource/Acer/Laptops/Swift_Go_14/Images/20240103/Acer-Swift-Go-14_SFG14-73T_Pure-Silver_01.png"
        ]
      }
    ]
  },

  // 7. Apple MacBook Air 13″ (M3, 2024) - Product #27
  {
    productId: 27,
    slug: "apple-macbook-air-13-m3",
    name: "Apple MacBook Air 13″ (M3, 2024)",
    productHeroUrl: "https://www.apple.com/newsroom/images/2024/03/apple-unveils-the-new-13-and-15-inch-macbook-air-with-the-powerful-m3-chip/article/Apple-MacBook-Air-2-up-hero-240304_big.jpg.large.jpg",
    productOverviewUrls: [
      "https://www.apple.com/newsroom/images/2024/03/apple-unveils-the-new-13-and-15-inch-macbook-air-with-the-powerful-m3-chip/article/Apple-MacBook-Air-Final-Cut-Pro-Stage-Manager-Pixelmator-240304_big.jpg.large.jpg",
      "https://www.apple.com/newsroom/images/2024/03/apple-unveils-the-new-13-and-15-inch-macbook-air-with-the-powerful-m3-chip/article/Apple-MacBook-Air-lifestyle-240304_big.jpg.large.jpg"
    ],
    colorVariants: [
      {
        color: "Midnight",
        variantUrls: [
          "https://www.apple.com/newsroom/images/2024/03/apple-unveils-the-new-13-and-15-inch-macbook-air-with-the-powerful-m3-chip/article/Apple-MacBook-Air-2-up-hero-240304_big.jpg.large.jpg"
        ]
      },
      {
        color: "Starlight",
        variantUrls: [
          "https://www.apple.com/newsroom/images/2024/03/apple-unveils-the-new-13-and-15-inch-macbook-air-with-the-powerful-m3-chip/article/Apple-MacBook-Air-2-up-front-240304_big.jpg.large.jpg"
        ]
      },
      {
        color: "Silver",
        variantUrls: [
          "https://www.apple.com/newsroom/images/2024/03/apple-unveils-the-new-13-and-15-inch-macbook-air-with-the-powerful-m3-chip/article/Apple-MacBook-Air-Excel-Slack-240304_big.jpg.large.jpg"
        ]
      }
    ]
  },

  // 8. Apple MacBook Air 15″ (M3, 2024) - Product #28
  {
    productId: 28,
    slug: "apple-macbook-air-15-m3",
    name: "Apple MacBook Air 15″ (M3, 2024)",
    productHeroUrl: "https://www.apple.com/newsroom/images/2024/03/apple-unveils-the-new-13-and-15-inch-macbook-air-with-the-powerful-m3-chip/article/Apple-MacBook-Air-lifestyle-240304_big.jpg.large.jpg",
    productOverviewUrls: [
      "https://www.apple.com/newsroom/images/2024/03/apple-unveils-the-new-13-and-15-inch-macbook-air-with-the-powerful-m3-chip/article/Apple-MacBook-Air-2-up-hero-240304_big.jpg.large.jpg"
    ],
    colorVariants: [
      {
        color: "Midnight",
        variantUrls: [
          "https://www.apple.com/newsroom/images/2024/03/apple-unveils-the-new-13-and-15-inch-macbook-air-with-the-powerful-m3-chip/article/Apple-MacBook-Air-2-up-hero-240304_big.jpg.large.jpg"
        ]
      },
      {
        color: "Starlight",
        variantUrls: [
          "https://www.apple.com/newsroom/images/2024/03/apple-unveils-the-new-13-and-15-inch-macbook-air-with-the-powerful-m3-chip/article/Apple-MacBook-Air-2-up-front-240304_big.jpg.large.jpg"
        ]
      },
      {
        color: "Space Grey",
        variantUrls: [
          "https://www.apple.com/newsroom/images/2024/03/apple-unveils-the-new-13-and-15-inch-macbook-air-with-the-powerful-m3-chip/article/Apple-MacBook-Air-Excel-Slack-240304_big.jpg.large.jpg"
        ]
      }
    ]
  },

  // 9. Apple MacBook Pro 16″ (M3 Pro & M3 Max) - Product #29
  {
    productId: 29,
    slug: "apple-macbook-pro-16-m3",
    name: "Apple MacBook Pro 16″ (M3 Pro & M3 Max)",
    productHeroUrl: "https://www.apple.com/newsroom/images/2023/10/apple-unveils-new-macbook-pro-featuring-m3-chips/article/Apple-MacBook-Pro-Space-Black-231030_big.jpg.large.jpg",
    productOverviewUrls: [
      "https://www.apple.com/newsroom/images/2023/10/apple-unveils-new-macbook-pro-featuring-m3-chips/article/Apple-MacBook-Pro-display-231030_big.jpg.large.jpg"
    ],
    colorVariants: [
      {
        color: "Space Black",
        variantUrls: [
          "https://www.apple.com/newsroom/images/2023/10/apple-unveils-new-macbook-pro-featuring-m3-chips/article/Apple-MacBook-Pro-Space-Black-231030_big.jpg.large.jpg"
        ]
      },
      {
        color: "Silver",
        variantUrls: [
          "https://www.apple.com/newsroom/images/2023/10/apple-unveils-new-macbook-pro-featuring-m3-chips/article/Apple-MacBook-Pro-silver-231030_big.jpg.large.jpg"
        ]
      }
    ]
  },

  // 10. Apple MacBook Air 13″ (M2, 2022/2023) - Product #30
  {
    productId: 30,
    slug: "apple-macbook-air-13-m2-2022-2023",
    name: "Apple MacBook Air 13″ (M2, 2022/2023)",
    productHeroUrl: "https://www.apple.com/newsroom/images/product/mac/standard/Apple-MacBook-Air-M2-hero-220606_big.jpg.large.jpg",
    productOverviewUrls: [
      "https://www.apple.com/newsroom/images/product/mac/standard/Apple-MacBook-Air-M2-lifestyle-220606_big.jpg.large.jpg"
    ],
    colorVariants: [
      {
        color: "Midnight",
        variantUrls: [
          "https://www.apple.com/newsroom/images/product/mac/standard/Apple-MacBook-Air-M2-midnight-220606_big.jpg.large.jpg"
        ]
      },
      {
        color: "Starlight",
        variantUrls: [
          "https://www.apple.com/newsroom/images/product/mac/standard/Apple-MacBook-Air-M2-starlight-220606_big.jpg.large.jpg"
        ]
      },
      {
        color: "Space Grey",
        variantUrls: [
          "https://www.apple.com/newsroom/images/product/mac/standard/Apple-MacBook-Air-M2-hero-220606_big.jpg.large.jpg"
        ]
      }
    ]
  },

  // 11. Dell XPS 13 (9340, 2024) - Product #31
  {
    productId: 31,
    slug: "dell-xps-13-9340",
    name: "Dell XPS 13 (9340, 2024)",
    productHeroUrl: "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-13-9340/media-gallery/graphite/notebook-xps-13-9340-nt-black-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000",
    productOverviewUrls: [
      "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-13-9340/media-gallery/graphite/notebook-xps-13-9340-nt-black-gallery-2.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000"
    ],
    colorVariants: [
      {
        color: "Graphite",
        variantUrls: [
          "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-13-9340/media-gallery/graphite/notebook-xps-13-9340-nt-black-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000"
        ]
      },
      {
        color: "Platinum Silver",
        variantUrls: [
          "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-13-9340/media-gallery/platinum/notebook-xps-13-9340-nt-silver-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000"
        ]
      }
    ]
  },

  // 12. Dell XPS 16 (9640, 2024) - Product #32
  {
    productId: 32,
    slug: "dell-xps-16-9640",
    name: "Dell XPS 16 (9640, 2024)",
    productHeroUrl: "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-16-9640/media-gallery/silver/notebook-xps-16-9640-t-silver-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000",
    productOverviewUrls: [
      "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-16-9640/media-gallery/silver/notebook-xps-16-9640-t-silver-gallery-2.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000"
    ],
    colorVariants: [
      {
        color: "Platinum Silver",
        variantUrls: [
          "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-16-9640/media-gallery/silver/notebook-xps-16-9640-t-silver-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000"
        ]
      },
      {
        color: "Graphite",
        variantUrls: [
          "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/xps-notebooks/xps-16-9640/media-gallery/graphite/notebook-xps-16-9640-t-black-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000"
        ]
      }
    ]
  },

  // 13. Dell Alienware m16 R2 - Product #33
  {
    productId: 33,
    slug: "dell-alienware-m16-r2",
    name: "Dell Alienware m16 R2",
    productHeroUrl: "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/alienware-notebooks/m16-r2/media-gallery/dark-metallic-moon/notebook-alienware-m16-r2-dark-metallic-moon-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000",
    productOverviewUrls: [
      "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/alienware-notebooks/m16-r2/media-gallery/dark-metallic-moon/notebook-alienware-m16-r2-dark-metallic-moon-gallery-2.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000"
    ],
    colorVariants: [
      {
        color: "Dark Metallic Moon",
        variantUrls: [
          "https://i.dell.com/is/image/DellContent/content/dam/ss2/product-images/dell-client-products/notebooks/alienware-notebooks/m16-r2/media-gallery/dark-metallic-moon/notebook-alienware-m16-r2-dark-metallic-moon-gallery-1.psd?fmt=png-alpha&pscan=auto&scl=1&hei=800&wid=1000"
        ]
      }
    ]
  },

  // 14. Lenovo ThinkPad X1 Carbon Gen 12 - Product #34
  {
    productId: 34,
    slug: "lenovo-thinkpad-x1-carbon-gen-12",
    name: "Lenovo ThinkPad X1 Carbon Gen 12",
    productHeroUrl: "https://p4-ofp.static.pub//fes/cms/2024/01/08/9z4u38m619g4l790w23e16l48c26i3124591.png",
    productOverviewUrls: [
      "https://p2-ofp.static.pub//fes/cms/2024/01/08/s3j7t221l22h5y3x46j131u2d123s5124592.png"
    ],
    colorVariants: [
      {
        color: "Deep Black",
        variantUrls: [
          "https://p4-ofp.static.pub//fes/cms/2024/01/08/9z4u38m619g4l790w23e16l48c26i3124591.png"
        ]
      }
    ]
  },

  // 15. Lenovo Legion Pro 7i Gen 9 (16″) - Product #35
  {
    productId: 35,
    slug: "lenovo-legion-pro-7i-gen-9",
    name: "Lenovo Legion Pro 7i Gen 9 (16″)",
    productHeroUrl: "https://p1-ofp.static.pub//fes/cms/2024/01/08/d3z346p4254v7o9c0w872v483j8273617382.png",
    productOverviewUrls: [
      "https://p3-ofp.static.pub//fes/cms/2024/01/08/k65934j7w47w68e0e854u201948573617383.png"
    ],
    colorVariants: [
      {
        color: "Eclipse Black",
        variantUrls: [
          "https://p1-ofp.static.pub//fes/cms/2024/01/08/d3z346p4254v7o9c0w872v483j8273617382.png"
        ]
      }
    ]
  },

  // 16. Lenovo Yoga Slim 7x (Copilot+ Snapdragon) - Product #36
  {
    productId: 36,
    slug: "lenovo-yoga-slim-7x",
    name: "Lenovo Yoga Slim 7x (Copilot+ Snapdragon)",
    productHeroUrl: "https://p2-ofp.static.pub//fes/cms/2024/05/20/m627h64k756l06n5o27464p6q17283628172.png",
    productOverviewUrls: [
      "https://p4-ofp.static.pub//fes/cms/2024/05/20/q527h64k756l06n5o27464p6q17283628173.png"
    ],
    colorVariants: [
      {
        color: "Cosmic Blue",
        variantUrls: [
          "https://p2-ofp.static.pub//fes/cms/2024/05/20/m627h64k756l06n5o27464p6q17283628172.png"
        ]
      }
    ]
  },

  // 17. HP OMEN Transcend 14 - Product #37
  {
    productId: 37,
    slug: "hp-omen-transcend-14",
    name: "HP OMEN Transcend 14",
    productHeroUrl: "https://ssl-product-images.www8-hp.com/digmedialib/world-products/psg_nb_pc_omen_transcend_14_intel_24c1/standard_3_hero_front.png",
    productOverviewUrls: [
      "https://ssl-product-images.www8-hp.com/digmedialib/world-products/psg_nb_pc_omen_transcend_14_intel_24c1/standard_3_angle_left.png"
    ],
    colorVariants: [
      {
        color: "Shadow Black",
        variantUrls: [
          "https://ssl-product-images.www8-hp.com/digmedialib/world-products/psg_nb_pc_omen_transcend_14_intel_24c1/standard_3_hero_front.png"
        ]
      },
      {
        color: "Ceramic White",
        variantUrls: [
          "https://ssl-product-images.www8-hp.com/digmedialib/world-products/psg_nb_pc_omen_transcend_14_intel_24c1/standard_3_hero_back.png"
        ]
      }
    ]
  },

  // 18. ASUS Zenbook DUO (2024, Dual 14″ OLED) - Product #38
  {
    productId: 38,
    slug: "asus-zenbook-duo-2024",
    name: "ASUS Zenbook DUO (2024, Dual 14″ OLED)",
    productHeroUrl: "https://dlcdnwebimgs.asus.com/gain/B513CDD3-4A59-4E60-B1EB-80B0D1CE722B/w1000/h750",
    productOverviewUrls: [
      "https://dlcdnwebimgs.asus.com/gain/4AE5063D-B46F-4BC3-A7BE-45DF8705F196/w1000/h750"
    ],
    colorVariants: [
      {
        color: "Inkwell Gray",
        variantUrls: [
          "https://dlcdnwebimgs.asus.com/gain/B513CDD3-4A59-4E60-B1EB-80B0D1CE722B/w1000/h750"
        ]
      }
    ]
  },

  // 19. Samsung Galaxy Book4 Pro - Product #39
  {
    productId: 39,
    slug: "samsung-galaxy-book4-pro",
    name: "Samsung Galaxy Book4 Pro",
    productHeroUrl: "https://images.samsung.com/is/image/samsung/p6pim/in/np940xgk-kg1in/gallery/in-galaxy-book4-pro-14-inch-np940xgk-494875-np940xgk-kg1in-thumb-539958087?$344_344_PNG$",
    productOverviewUrls: [
      "https://images.samsung.com/is/image/samsung/p6pim/in/np940xgk-kg1in/gallery/in-galaxy-book4-pro-14-inch-np940xgk-494875-np940xgk-kg1in-539958089?$684_547_PNG$"
    ],
    colorVariants: [
      {
        color: "Moonstone Gray",
        variantUrls: [
          "https://images.samsung.com/is/image/samsung/p6pim/in/np940xgk-kg1in/gallery/in-galaxy-book4-pro-14-inch-np940xgk-494875-np940xgk-kg1in-539958089?$684_547_PNG$"
        ]
      },
      {
        color: "Platinum Silver",
        variantUrls: [
          "https://images.samsung.com/is/image/samsung/p6pim/in/np940xgk-kg1in/gallery/in-galaxy-book4-pro-14-inch-np940xgk-494875-np940xgk-kg1in-thumb-539958087?$344_344_PNG$"
        ]
      }
    ]
  },

  // 20. Microsoft Surface Laptop 7 (Copilot+ PC) - Product #40
  {
    productId: 40,
    slug: "microsoft-surface-laptop-7",
    name: "Microsoft Surface Laptop 7 (Copilot+ PC)",
    productHeroUrl: "https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RW1keC4?ver=43c3",
    productOverviewUrls: [
      "https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RW1klv6?ver=cf37"
    ],
    colorVariants: [
      {
        color: "Platinum",
        variantUrls: [
          "https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RW1keC4?ver=43c3"
        ]
      },
      {
        color: "Black",
        variantUrls: [
          "https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RW1klv6?ver=cf37"
        ]
      },
      {
        color: "Sapphire",
        variantUrls: [
          "https://img-prod-cms-rt-microsoft-com.akamaized.net/cms/api/am/imageFileData/RW1keC4?ver=43c3"
        ]
      }
    ]
  }
];
