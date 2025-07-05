import { mergePlayerData } from './player-data-util';
import { Player } from '@/types/player';

const PlayerList: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlayersAndADP = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch Sleeper players
        const res = await fetch('https://api.sleeper.app/v1/players/nfl');
        if (!res.ok) throw new Error('Failed to fetch players');
        const data = await res.json();
        const sleeperPlayers = Object.values(data)
          .filter((p: any) =>
            p.status === 'Active' &&
            p.position &&
            ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'].includes(p.position) &&
            p.full_name &&
            p.team &&
            p.rotoworld_id
          );
        // Fetch FFC/ADP data
        const year = league?.season || new Date().getFullYear();
        const teams = league?.totalRosters || 12;
        const adpUrl = `/api/adp-proxy?type=${adpType}&teams=${teams}&year=${year}`;
        const adpRes = await fetch(adpUrl);
        if (!adpRes.ok) throw new Error('Failed to fetch ADP');
        const adpJson = await adpRes.json();
        const adpPlayers = adpJson.players || [];
        // Merge data using utility
        const merged = mergePlayerData(sleeperPlayers, adpPlayers);
        // Sort by ADP (lowest first, undefined last)
        setPlayers(merged.sort((a, b) => (a.adp ?? 9999) - (b.adp ?? 9999)));
      } catch (err: any) {
        setError(err.message || 'An error occurred');
      } finally {
        setLoading(false);
      }
    };
    fetchPlayersAndADP();
  }, [adpType, league]);

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default PlayerList; 