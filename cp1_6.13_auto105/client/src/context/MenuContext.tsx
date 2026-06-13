import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SavedMenu, Dish, Ingredient, Season } from '../types';

interface MenuContextType {
  savedMenus: SavedMenu[];
  favoriteMenus: SavedMenu[];
  saveMenu: (menu: Dish[], season: Season, cuisine: string, imageUrl?: string, ingredients?: Ingredient[]) => void;
  toggleFavorite: (menuId: string) => void;
  deleteMenu: (menuId: string) => void;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: ReactNode }) {
  const [savedMenus, setSavedMenus] = useState<SavedMenu[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('shiguang_menus');
    if (saved) {
      setSavedMenus(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('shiguang_menus', JSON.stringify(savedMenus));
  }, [savedMenus]);

  const saveMenu = (
    menu: Dish[],
    season: Season,
    cuisine: string,
    imageUrl?: string,
    ingredients?: Ingredient[]
  ) => {
    const newMenu: SavedMenu = {
      id: Date.now().toString(),
      createdAt: Date.now(),
      season,
      cuisine,
      menu,
      imageUrl,
      ingredients,
      isFavorite: false
    };
    setSavedMenus(prev => [newMenu, ...prev]);
  };

  const toggleFavorite = (menuId: string) => {
    setSavedMenus(prev =>
      prev.map(menu =>
        menu.id === menuId ? { ...menu, isFavorite: !menu.isFavorite } : menu
      )
    );
  };

  const deleteMenu = (menuId: string) => {
    setSavedMenus(prev => prev.filter(menu => menu.id !== menuId));
  };

  const favoriteMenus = savedMenus.filter(menu => menu.isFavorite);

  return (
    <MenuContext.Provider value={{ savedMenus, favoriteMenus, saveMenu, toggleFavorite, deleteMenu }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenu must be used within a MenuProvider');
  }
  return context;
}
