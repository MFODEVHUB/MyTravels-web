import { describe, expect, it } from 'vitest'
import { detectDevice } from './device'

const UA = {
  pixel: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36',
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  ipadAsMac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  linux: 'Mozilla/5.0 (X11; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0',
}

describe('detectDevice', () => {
  it('reconnaît Android avant Linux', () => {
    expect(detectDevice(UA.pixel)).toBe('android')
  })
  it('reconnaît iPhone, et un iPad qui se présente comme un Mac', () => {
    expect(detectDevice(UA.iphone)).toBe('ios')
    expect(detectDevice(UA.ipadAsMac, 5)).toBe('ios')
  })
  it('reconnaît les ordinateurs', () => {
    expect(detectDevice(UA.mac, 0)).toBe('desktop')
    expect(detectDevice(UA.windows)).toBe('desktop')
    expect(detectDevice(UA.linux)).toBe('desktop')
  })
  it('renvoie "other" pour un agent inconnu', () => {
    expect(detectDevice('curl/8.0')).toBe('other')
  })
})
