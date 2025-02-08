import { NextResponse } from "next/server";
import yaml from "yaml";

interface YSWSProgram {
  id: string;
  fields: {
    Name: string;
    "Unweighted–Total": number;
    Status?: string;
  };
}

function normalizeString(str: string) {
  return str.toLowerCase().trim();
}

export async function GET() {
  try {
    const [yamlResponse, airtableResponse] = await Promise.all([
      fetch(`https://ysws.hackclub.com/data.yml?t=${Date.now()}`, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      }),
      fetch(
        "https://api2.hackclub.com/v0.1/Unified%20YSWS%20Projects%20DB/YSWS%20Programs?cache=true",
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:135.0) Gecko/20100101 Firefox/135.0",
            Accept: "*/*",
            Origin: "https://ysws.hackclub.com",
            Referer: "https://ysws.hackclub.com/",
          },
        }
      ),
    ]);

    const yamlText = await yamlResponse.text();
    console.log("Raw YAML text:", yamlText);

    const yamlData = yaml.parse(yamlText);
    console.log("Parsed YAML data:", yamlData);

    const airtableData = await airtableResponse.json();

    const yamlPrograms = new Map();

    ["indefinite", "limitedTime", "drafts", "noYouShip", "completed"].forEach(
      (category) => {
        if (yamlData[category]) {
          yamlData[category].forEach((program: any) => {
            yamlPrograms.set(normalizeString(program.name), {
              name: program.name,
              participants: program.participants || 0,
              status:
                program.status ||
                (category === "completed"
                  ? "completed"
                  : category === "drafts"
                  ? "alpha/unconfirmed"
                  : "active"),
            });
          });
        }
      }
    );

    console.log("YAML Programs:", Object.fromEntries(yamlPrograms));

    // First create the base data from YAML
    const combinedData = Array.from(yamlPrograms.entries()).map(
      ([_, program]) => ({
        id: normalizeString(program.name), // Use normalized name as ID for YAML entries
        fields: {
          Name: program.name,
          "Unweighted–Total": program.participants,
          Status: program.status,
        },
      })
    );

    // Then only add Airtable programs that don't exist in YAML
    airtableData.forEach((program: YSWSProgram) => {
      const normalizedAirtableName = normalizeString(program.fields.Name);
      const existsInYaml = Array.from(yamlPrograms.entries()).some(
        ([yamlName, _]) =>
          yamlName.includes(normalizedAirtableName) ||
          normalizedAirtableName.includes(yamlName)
      );

      if (!existsInYaml) {
        combinedData.push({
          id: program.id,
          fields: {
            Name: program.fields.Name,
            "Unweighted–Total": program.fields["Unweighted–Total"],
            Status: "alpha/unconfirmed",
          },
        });
      }
    });

    // Sort by participant count
    const sortedData = combinedData.sort(
      (a, b) =>
        (b.fields["Unweighted–Total"] || 0) -
        (a.fields["Unweighted–Total"] || 0)
    );

    if (process.env.CF_API_TOKEN) {
      await fetch(
        "https://api.cloudflare.com/client/v4/accounts/" +
          process.env.CF_ACCOUNT_ID +
          "/storage/kv/namespaces/" +
          process.env.CF_NAMESPACE_ID +
          "/values/ysws-programs",
        {
          method: "PUT",
          headers: {
            Authorization: "Bearer " + process.env.CF_API_TOKEN,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sortedData),
        }
      );
    }

    return NextResponse.json(sortedData);
  } catch (error) {
    console.error("Error fetching YSWS data:", error);
    return NextResponse.json(
      { error: "Failed to fetch YSWS data" },
      { status: 500 }
    );
  }
}
