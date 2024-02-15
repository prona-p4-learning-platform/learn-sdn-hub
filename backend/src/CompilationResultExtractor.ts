// /tmp/test-wbo225/test.p4(13):syntax error, unexpected TYPEDEF, expecting ;
export interface CompilationError {
  line: number;
  message: string;
}

const regex = /\((\d*)\):(.+?)\n/i;

export default function (stderr: string): CompilationError[] {
  const errors: CompilationError[] = [];
  const result = stderr.match(regex);

  if (result !== null) {
    errors.push({
      line: Number.parseInt(result[1]),
      message: result[2],
    });
  }

  return errors;
}
