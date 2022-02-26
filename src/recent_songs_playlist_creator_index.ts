import _ = require("underscore");
import { Playlist_Creator } from "./playlist_creator";
import { Song_Provider } from "./song_provider";
import { Error_Handler } from "./error_handler"; //TODO: Look into the differences between SpotifyWebApi and these
import { create_spotify } from "./spotify_factory";

const config = require('./config.json');

class PlaylistCreateEvent {
    PlaylistName: string
}

class Dependencies {
    error_handler : Error_Handler
    song_provider : Song_Provider
    playlist_creator : Playlist_Creator
}

//This handler is used as the lambda entry point and generates dependencies to be passed into handler
export async function lambda_handler(event : PlaylistCreateEvent) : Promise<void> {
    const dependencies = new Dependencies();
    dependencies.error_handler = new Error_Handler();
    try {
        const spotify = await create_spotify(config.client_id, config.client_secret, config.refresh_token);
        dependencies.playlist_creator = new Playlist_Creator(spotify);
        dependencies.song_provider = new Song_Provider(spotify);
    }
    catch (error) {
        dependencies.error_handler.handle_error(error);
    }
    await handler(event, dependencies);
}

//This handler is called by lambda_handler, and is useful for dependency injecting for local development
export async function handler(event : PlaylistCreateEvent, dependencies : Dependencies): Promise<void> {
    let playlistName = event?.PlaylistName?.trim() ? event.PlaylistName : `Programmed Playlist - ${new Date().toLocaleString()}`;
    try {
        let recentSongs = await dependencies.song_provider.get_recently_played_songs(50);
        let songs = new Set(
                recentSongs.flatMap(song => `spotify:track:${song.track.id}`) //spotify song ids need to be prefixed with spotify:track:
            ); //Remove duplicates
        await dependencies.playlist_creator.create_playlist(Array.from(songs), playlistName, false);
    }
    catch (error) {
        dependencies.error_handler.handle_error(error);
    }
}