package artwork

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"image/png"
	"io"
	"time"

	"github.com/chai2010/webp"
	"github.com/disintegration/imaging"
	"github.com/navidrome/navidrome/log"
	"github.com/navidrome/navidrome/model"
)

type resizedArtworkReader struct {
	artID      model.ArtworkID
	cacheKey   string
	lastUpdate time.Time
	size       int
	square     bool
	a          *artwork
}

func resizedFromOriginal(ctx context.Context, a *artwork, artID model.ArtworkID, size int, square bool) (*resizedArtworkReader, error) {
	r := &resizedArtworkReader{a: a}
	r.artID = artID
	r.size = size
	r.square = square

	// Get lastUpdated and cacheKey from original artwork
	original, err := a.getArtworkReader(ctx, artID, 0, false)
	if err != nil {
		return nil, err
	}
	r.cacheKey = original.Key()
	r.lastUpdate = original.LastUpdated()
	return r, nil
}

func (a *resizedArtworkReader) Key() string {
	baseKey := fmt.Sprintf("%s.%d", a.cacheKey, a.size)
	if a.square {
		return baseKey + ".square.webp"
	}
	// WebP quality is fixed at 80 for consistent caching
	return baseKey + ".webp80"
}

func (a *resizedArtworkReader) LastUpdated() time.Time {
	return a.lastUpdate
}

func (a *resizedArtworkReader) Reader(ctx context.Context) (io.ReadCloser, string, error) {
	// Get artwork in original size, possibly from cache
	orig, _, err := a.a.Get(ctx, a.artID, 0, false)
	if err != nil {
		return nil, "", err
	}
	defer orig.Close()

	resized, origSize, err := resizeImage(orig, a.size, a.square)
	if resized == nil {
		log.Trace(ctx, "Image smaller than requested size", "artID", a.artID, "original", origSize, "resized", a.size, "square", a.square)
	} else {
		log.Trace(ctx, "Resizing artwork", "artID", a.artID, "original", origSize, "resized", a.size, "square", a.square)
	}
	if err != nil {
		log.Warn(ctx, "Could not resize image. Will return image as is", "artID", a.artID, "size", a.size, "square", a.square, err)
	}
	if err != nil || resized == nil {
		// if we couldn't resize the image, return the original
		orig, _, err = a.a.Get(ctx, a.artID, 0, false)
		return orig, "", err
	}
	return io.NopCloser(resized), fmt.Sprintf("%s@%d", a.artID, a.size), nil
}

func resizeImage(reader io.Reader, size int, square bool) (io.Reader, int, error) {
	original, format, err := image.Decode(reader)
	if err != nil {
		return nil, 0, err
	}

	bounds := original.Bounds()
	originalSize := max(bounds.Max.X, bounds.Max.Y)

	if originalSize <= size && !square {
		return nil, originalSize, nil
	}

	var resized image.Image
	if originalSize >= size {
		resized = imaging.Fit(original, size, size, imaging.Lanczos)
	} else {
		if bounds.Max.Y < bounds.Max.X {
			resized = imaging.Resize(original, size, 0, imaging.Lanczos)
		} else {
			resized = imaging.Resize(original, 0, size, imaging.Lanczos)
		}
	}
	if square {
		bg := image.NewRGBA(image.Rect(0, 0, size, size))
		resized = imaging.OverlayCenter(bg, resized, 1)
	}

	buf := new(bytes.Buffer)
	// Use WebP for better compression (except for PNG with transparency)
	// WebP provides ~30% better compression than JPEG
	if format == "png" && !square {
		// Keep PNG if it has transparency and we're not making it square
		err = png.Encode(buf, resized)
	} else {
		// Use WebP for all other cases (JPEG, square images)
		// Quality 80 provides good balance between size and quality
		err = webp.Encode(buf, resized, &webp.Options{Quality: 80, Lossless: false})
	}
	return buf, originalSize, err
}
