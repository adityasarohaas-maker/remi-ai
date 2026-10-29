/** Where the demo chooser may send people: the tablet only when a demo device token exists. */
export function demoLinks(token: string | undefined): { tablet: string | null; portal: true } {
  return { tablet: token ? `/patient/${token}` : null, portal: true };
}
