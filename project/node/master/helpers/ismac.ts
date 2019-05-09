const MAC_RE: RegExp = /((?:[A-F0-9]{2})(?:\:[A-F0-9]{2}){5})/

function isMAC(input: string): boolean {
    if(MAC_RE.exec(input) != null) {
        return true;
    }

    return false;
}

export { isMAC };