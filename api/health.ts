import { NowRequest, NowResponse } from "@now/node";

const Airtable = require('airtable');
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID);
const table = base(process.env.AIRTABLE_TABLE_NAME);

/**
 * Format the sample to a more friendly data structure
 * @param {values: string; timestamps: string;} entry
 * @returns {Array<{ value: number; timestamp: string }>}
 */
const formathealthSample = (entry: {
  values: string;
  timestamps: string;
}): Array<{ value: number; timestamp: string }> => {
  /**
   * We destructure the sample entry based on the structure defined in the dictionaries
   * in the Get Content Of action of our shortcut
   */
  const { values, timestamps } = entry;

  const formattedSample = values
    // split the string by \n to obtain an array of values
    .split("\n")
    // [Edge case] filter out any potential empty strings, these happen when a new day starts and no values have been yet recorded
    .filter((item) => item !== "")
    .map((item, index) => {
      return {
        value: parseInt(item, 10),
        timestamp: timestamps.split("\n")[index],
      };
    });

  return formattedSample;
};

/**
 * The handler of serverless function
 * @param {NowRequest} req 
 * @param {NowResponse} res
 */
const handler = async (
  req: NowRequest,
  res: NowResponse
): Promise<NowResponse> => {
  /**
   * Destructure the body of the request based on the payload defined in the shortcut
   */
  const { heart, steps, date: deviceDate } = req.body;

  /**
   * Format the steps data
   */
  const formattedStepsData = formathealthSample(steps);
  console.info(
    `Steps: ${
      formattedStepsData.filter((item) => item.value !== 0).length
    } items`
  );

  /**
   * Format the heart data
   */
  const formattedHeartData = formathealthSample(heart);
  console.info(`Heart Rate: ${formattedHeartData.length} items`);

  /**
   * Variable "today" is a date set based on the device date at midninight
   * This will be used as way to timestamp our documents in the database 
   */
  const today = new Date(`${deviceDate}T00:00:00.000Z`);

  const entry = {
    heartRate: formattedHeartData,
    steps: formattedStepsData,
    date: today,
  };

  console.log(entry);

  // Write data to database here...

  try {
    const importedEntry = await table.create([{ entry }]);
    return res.status(200).json({ response: "OK" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ response: error.response.errors[0].message });
  };
};

export default handler;