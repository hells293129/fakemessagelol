// revenge-moj-plugin/src/index.ts
import fetch from 'node-fetch'; 

// === Symulacja Vendetta API dla TypeScript ===
// W rzeczywistym projekcie Vendetta, te importy byłyby dostępne:
// import { commands } from "@vendetta/commands";
// import { showToast } from "@vendetta/ui/toasts";

// Dla poprawnego typowania w środowisku kompilacji, musimy je zadeklarować:
declare module "@vendetta/commands" {
    export const commands: {
        registerCommand: (config: any) => any;
        unregisterCommand: (name: string) => void;
    };
}
declare const commands: any; // Deklaracja globalnego dostępu do obiektu commands
declare const RevengeAPI: any; // Ponowna deklaracja hipotetycznego API do wysyłania embedów
// ==========================================


// Interfejsy dla danych zwracanych przez API (Dzięki TS!)
interface FinderResult {
    nickname: string;
    address: string;
    rawAddress: string;
    Avatar: string;
    nameMcLink: string;
    labyModLink: string;
}

interface FinderResponse {
    status: "success" | "error";
    result_type: string;
    result?: FinderResult;
    message?: string;
}

const API_URL_BASE = 'https://vast-cap-finder.vercel.app/api/find?nick=';
let commandReference: any; 

// Symulacja funkcji wysyłającej embed od Clyde'a
function sendClydeEmbed(channelId: string, embedData: any, components: any[] = []): void {
    try {
        // Używamy hipotezy, że Revenge udostępnia funkcję do wysyłania embedów
        RevengeAPI.Chat.sendClydeEmbed(channelId, { embeds: [embedData], components: components });
    } catch (e) {
        console.warn(`[FinderPlugin] Nie znaleziono RevengeAPI.Chat.sendClydeEmbed. Sprawdź konsole Discorda.`);
    }
}


// Handler komendy /find (jest async, bo wykonuje fetch)
async function handleFindCommand(args: any[], channelId: string): Promise<void> {
    // Argumenty komendy w Vendetta/Revenge są przekazywane jako tablica opcji, 
    // gdzie pierwsza opcja (nick) jest pod indeksem 0
    const nick: string | undefined = args[0]?.value; 
    
    if (!nick) {
        sendClydeEmbed(channelId, { title: "Błąd", description: "Proszę podać nick do wyszukania.", color: 0xFF0000 });
        return;
    }
    
    // 1. Wiadomość "Czekam..."
    sendClydeEmbed(channelId, { 
        title: `Wyszukiwanie **${nick}**...`, 
        description: "Kontaktowanie z VAST Cap Finder API...",
        color: 0xFFA500 
    });

    try {
        // 2. Zapytanie API
        const response = await fetch(API_URL_BASE + encodeURIComponent(nick));
        const data: FinderResponse = await response.json();
        
        let embed: any;
        let components: any[] = [];
        let color: number;

        if (data.status === "success" && data.result) {
            const result = data.result;
            color = 0x00FF00;
            
            embed = {
                title: `🔎 ${data.result_type.toUpperCase()}`,
                thumbnail: { url: result.Avatar },
                fields: [
                    { name: "👤 Nickname", value: result.nickname, inline: true },
                    { name: "IP Address", value: result.address, inline: true },
                    { name: "Raw IP Address", value: `\`${result.rawAddress}\``, inline: false } 
                ],
                footer: { text: "Dane dostarczone przez VAST Cap Finder" }
            };

            // Tworzenie przycisków
            components = [
                {
                    type: 1, // Action Row
                    components: [
                        { type: 2, style: 5, label: "NameMC", url: result.nameMcLink },
                        { type: 2, style: 5, label: "LabyMod", url: result.labyModLink }
                    ]
                }
            ];

        } else {
            // Obsługa błędu lub nieznalezionego nicku
            color = 0xFF0000;
            embed = {
                title: `❌ ${data.result_type.toUpperCase() || 'BŁĄD'}`,
                description: data.message || `Nie znaleziono danych dla nicku: **${nick}**.`
            };
        }

        // 3. Ostateczne wysłanie embedu
        sendClydeEmbed(channelId, { ...embed, color: color }, components);

    } catch (error) {
        console.error("[FinderPlugin] Błąd komunikacji z API:", error);
        sendClydeEmbed(channelId, {
            title: "⚠️ Błąd serwera",
            description: "Nie udało się połączyć z usługą VAST Cap Finder.",
            color: 0xDC143C 
        });
    }
}


// === Funkcja ładowania (Włączenie pluginu) ===
export function onLoad(): void {
    console.log("[FinderPlugin] Ładowanie...");
    
    // Użycie VENDETTA API do rejestracji komendy
    try {
        commandReference = commands.registerCommand({
            name: "find",
            description: "Wyszukuje dane użytkownika na podstawie nicku (VAST Cap Finder).",
            options: [
                {
                    name: "nick",
                    description: "Nick do wyszukania",
                    type: 3, // Typ String
                    required: true,
                }
            ],
            type: 1, // SLASH (CHATTING)
            applicationId: "-1", // Zawsze -1 dla lokalnych komend
            execute: handleFindCommand,
        });
        console.log("[FinderPlugin] Komenda /find zarejestrowana.");
    } catch (e) {
        console.error("[FinderPlugin] Błąd rejestracji komendy. Sprawdź, czy Vendetta/Revenge API jest wstrzyknięte.", e);
    }
}

// === Funkcja czyszczenia (Wyłączenie pluginu) ===
export function onUnload(): void {
    console.log("[FinderPlugin] Odładowywanie...");
    
    try {
        // Usunięcie komendy
        if (commandReference) {
            commands.unregisterCommand("find");
        }
    } catch (e) {
        console.error("[FinderPlugin] Błąd podczas usuwania komendy.", e);
    }
    
    console.log("[FinderPlugin] Gotowe.");
    }
