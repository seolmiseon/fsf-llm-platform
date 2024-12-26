// app.get('/api/matches', async (req, res) => {
//     try {
//         const res = await fetch('https://api.football-data.org/v4/matches', {
//             headers: {
//                 'X-Auth-Token': process.env.FOOTBALL_API_KEY,
//             },
//         });
//         const data = await res.json();
//         console.log('요청성공', data);
//         res.json();
//     } catch (error) {
//         console.log('요청실패', error);
//         res.status(500).json({ message: 'API 요청에 실패했습니다.' });
//     }
// });

// app.listen(5000, () => {
//     console.log('Server is running on port 5000');
// });
