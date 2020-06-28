# DTX Statistics Analyser
 
Run command line as follows:

```
> node .\bin\index.js -h
usage: index.js [-h] [-v] -i INPUT -o OUTPUT [-j JSON]

DTX Statistics Analyser. Generates a CSV file that contains various
statistics such as startTime, Duration, Note Count per Bar for the input DTX 
file

Optional arguments:
  -h, --help            Show this help message and exit.
  -v, --version         Show program's version number and exit.
  -i INPUT, --input INPUT
                        Input DTX File
  -o OUTPUT, --output OUTPUT
                        Output CSV File containing statistical data for input
                        DTX
  -j JSON, --json JSON  The output path for the intermediate JSON file
```