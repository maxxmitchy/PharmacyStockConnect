import { Pharmacy } from "../types";

const STORAGE_KEY = 'pharmaconnect_db_v1';

export const savePharmacies = (pharmacies: Pharmacy[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pharmacies));
  } catch (error) {
    console.error("Failed to save to database", error);
  }
};

export const loadPharmacies = (): Pharmacy[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load from database", error);
    return [];
  }
};