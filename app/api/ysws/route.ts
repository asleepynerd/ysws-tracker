import { NextResponse } from 'next/server';
import yaml from 'yaml';

interface YSWSProgram {
  id: string;
  fields: {
    Name: string;
    'Unweighted–Total': number;
    Status?: string;
  };
}

export async function GET() {
  try {
    const [yamlResponse, airtableResponse] = await Promise.all([
      fetch('https://ysws.hackclub.com/data.yml'),
      fetch('https://api2.hackclub.com/v0.1/Unified%20YSWS%20Projects%20DB/YSWS%20Programs?cache=true', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0',
          'Accept': '*/*',
          'Origin': 'https://ysws.hackclub.com',
          'Referer': 'https://ysws.hackclub.com/'
        }
      })
    ]);

    const yamlText = await yamlResponse.text();
    const yamlData = yaml.parse(yamlText);
    const airtableData = await airtableResponse.json();

    const yamlPrograms = new Map();
    
    ['indefinite', 'limitedTime', 'drafts', 'noYouShip', 'completed'].forEach(category => {
      if (yamlData[category]) {
        yamlData[category].forEach((program: any) => {
          yamlPrograms.set(program.name.toLowerCase(), {
            name: program.name,
            participants: program.participants || 0,
            status: program.status
          });
        });
      }
    });

    const combinedData = airtableData.map((program: YSWSProgram) => {
      const programName = program.fields.Name.toLowerCase();
      const yamlProgram = yamlPrograms.get(programName);

      return {
        id: program.id,
        fields: {
          Name: program.fields.Name,
          'Unweighted–Total': yamlProgram ? yamlProgram.participants : program.fields['Unweighted–Total'],
          Status: yamlProgram ? yamlProgram.status : 'alpha/unconfirmed'
        }
      };
    });

    if (process.env.CF_API_TOKEN) {
      await fetch('https://api.cloudflare.com/client/v4/accounts/' + process.env.CF_ACCOUNT_ID + '/storage/kv/namespaces/' + process.env.CF_NAMESPACE_ID + '/values/ysws-programs', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer ' + process.env.CF_API_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(combinedData)
      });
    }

    return NextResponse.json(combinedData);
  } catch (error) {
    console.error('Error fetching YSWS data:', error);
    return NextResponse.json({ error: 'Failed to fetch YSWS data' }, { status: 500 });
  }
}