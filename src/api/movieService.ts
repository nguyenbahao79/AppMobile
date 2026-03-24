import { Movie } from '../mocks/movies';

// Use your computer's IP address here if testing on a physical device.
// 10.0.2.2 is the default for Android Emulators to reach localhost.
const API_BASE_URL = 'http://10.0.2.2:8080/api'; 

export const movieService = {
  async getMovies(): Promise<Movie[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/movies`);
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching movies:', error);
      throw error;
    }
  },
};
